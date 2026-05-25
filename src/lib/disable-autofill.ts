/**
 * Disable browser/password-manager autofill suggestions globally.
 *
 * Android Chrome (and most mobile keyboards) shows a white suggestion strip
 * above the keyboard — credentials, payment cards, addresses, contacts —
 * whenever it heuristically classifies an <input> as a login/CC/address
 * field. The heuristics use: input type, `name`, `id`, `autocomplete`,
 * placeholder text, surrounding labels, and whether the field lives inside
 * a <form>.
 *
 * GoRoll is a D&D campaign tool: no credentials, no payments, no addresses.
 * We blanket-disable autofill on every input/textarea AND every <form>,
 * including password-like fields (the PIN entry), by:
 *   - setting `autocomplete="off"` (or `new-password` for type=password,
 *     which is the only value Chromium reliably honours to suppress the
 *     password manager strip on real password inputs)
 *   - clearing autocorrect / autocapitalize / spellcheck
 *   - adding password-manager opt-out attributes (1Password, LastPass,
 *     Bitwarden, Dashlane)
 *   - rewriting credential-ish `name`/`id` tokens (user, email, pass, pin,
 *     card, cvc, address, phone, zip, postal, otp) to a neutral
 *     `rpg-field-<n>` so Chrome's heuristics can't match them
 *
 * A MutationObserver re-applies the rule to inputs / forms rendered later
 * (modals, dialogs, dynamic forms) without per-component edits.
 *
 * Opt out per-input with `data-allow-autofill="true"` (none today).
 */

const CREDENTIAL_NAME_RE =
  /(user|name|email|mail|pass|pwd|pin|login|account|card|cc[-_]?(num|number|name|exp|cvc|cvv)|cvv|cvc|exp|address|street|city|state|zip|postal|country|phone|tel|mobile|otp|code|verification)/i;

let counter = 0;
const neutralName = () => `rpg-field-${++counter}`;

function hardenInput(el: HTMLInputElement | HTMLTextAreaElement) {
  if (el.dataset.allowAutofill === "true") return;

  // For real <input type="password">, "off" is widely ignored by Chromium —
  // "new-password" is the only token that reliably suppresses the saved-password
  // strip on Android. For everything else, "off" is enough.
  const isPassword = el instanceof HTMLInputElement && (el.type || "").toLowerCase() === "password";
  const desired = isPassword ? "new-password" : "off";
  if (el.getAttribute("autocomplete") !== desired) el.setAttribute("autocomplete", desired);

  if (el.getAttribute("autocorrect") !== "off") el.setAttribute("autocorrect", "off");
  if (el.getAttribute("autocapitalize") !== "off") el.setAttribute("autocapitalize", "off");
  if (el.spellcheck !== false) el.spellcheck = false;

  if (!el.hasAttribute("data-lpignore")) el.setAttribute("data-lpignore", "true");
  if (!el.hasAttribute("data-1p-ignore")) el.setAttribute("data-1p-ignore", "true");
  if (!el.hasAttribute("data-bwignore")) el.setAttribute("data-bwignore", "true");
  if (!el.hasAttribute("data-dashlane-ignore")) el.setAttribute("data-dashlane-ignore", "true");
  if (!el.hasAttribute("data-form-type")) el.setAttribute("data-form-type", "other");

  // Always replace name/id with a neutral token so Chromium's heuristic
  // classifier (Android Chrome keyboard strip: passwords / cards / contacts /
  // addresses) can't tag the field as anything. Opt out per-field with
  // data-allow-autofill="true". The app does not rely on native form
  // submission, so renaming `name` is safe.
  // Keep CREDENTIAL_NAME_RE around as a doc of which tokens are dangerous.
  void CREDENTIAL_NAME_RE;
  const nm = el.getAttribute("name");
  if (!nm || !/^rpg-field-\d+$/.test(nm)) el.setAttribute("name", neutralName());
  const id = el.getAttribute("id");
  if (id && !/^rpg-field-\d+$/.test(id)) el.setAttribute("id", neutralName());
}

function hardenForm(form: HTMLFormElement) {
  if (form.dataset.allowAutofill === "true") return;
  if (form.getAttribute("autocomplete") !== "off") form.setAttribute("autocomplete", "off");
  if (!form.hasAttribute("data-form-type")) form.setAttribute("data-form-type", "other");
}

function scan(root: ParentNode) {
  root.querySelectorAll("input, textarea").forEach(el => {
    hardenInput(el as HTMLInputElement | HTMLTextAreaElement);
  });
  root.querySelectorAll("form").forEach(f => hardenForm(f as HTMLFormElement));
}

let mounted = false;

export function mountDisableAutofill() {
  if (mounted || typeof document === "undefined") return;
  mounted = true;

  scan(document);

  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        const el = node as Element;
        if (typeof (el as any).matches === "function") {
          if (el.matches("input, textarea")) {
            hardenInput(el as HTMLInputElement | HTMLTextAreaElement);
          } else if (el.matches("form")) {
            hardenForm(el as HTMLFormElement);
          }
        }
        if (typeof (el as any).querySelectorAll === "function") scan(el);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
