import React from 'react';
import { X, UserPlus, Eye, EyeOff, Settings, Shield, Users, Layout, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isDM: boolean;
  
  // Visibility toggles
  showIniciativa: boolean;
  onToggleIniciativa: () => void;
  showParticipants: boolean;
  onToggleParticipants: () => void;
  showToolbar: boolean;
  onToggleToolbar: () => void;
  
  // Actions
  onInvokeToken: () => void;
  onOpenSettings: () => void;
}

export const BattleMapAdminSidebar: React.FC<Props> = ({
  isOpen,
  onClose,
  isDM,
  showIniciativa,
  onToggleIniciativa,
  showParticipants,
  onToggleParticipants,
  showToolbar,
  onToggleToolbar,
  onInvokeToken,
  onOpenSettings
}) => {
  const { t } = useT();

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 w-full sm:w-80 bg-[#0a0a0c]/98 border-l border-white/10 flex flex-col z-[150] backdrop-blur-xl shadow-2xl transition-all animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex flex-col">
          <h2 className="font-display text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
            {isDM ? 'Administración' : 'Opciones de Interfaz'}
          </h2>
          <span className="text-[7px] text-muted-foreground uppercase tracking-widest mt-0.5">
            {isDM ? 'Control del Dungeon Master' : 'Personaliza tu vista'}
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Sección: Acciones Rápidas (DM Solo) */}
        {isDM && (
          <div className="space-y-3">
            <h3 className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold px-1">Acciones</h3>
            <div className="grid grid-cols-1 gap-2">
              <Button 
                onClick={onInvokeToken}
                className="w-full justify-start gap-3 bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20 border-white/10 text-[var(--gold)] h-12 rounded-xl"
              >
                <UserPlus size={18} />
                <span className="text-xs font-display uppercase tracking-widest">Invocar Token</span>
              </Button>
              
              <Button 
                onClick={onOpenSettings}
                variant="outline"
                className="w-full justify-start gap-3 bg-white/5 border-white/10 text-white h-12 rounded-xl"
              >
                <Settings size={18} />
                <span className="text-xs font-display uppercase tracking-widest">Ajustes del Mapa</span>
              </Button>
            </div>
          </div>
        )}

        {/* Sección: Visibilidad (Para todos) */}
        <div className="space-y-3">
          <h3 className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold px-1">Interfaz</h3>
          <div className="space-y-1">
            <VisibilityToggle 
              label="Lista de Rondas" 
              isActive={showIniciativa} 
              onToggle={onToggleIniciativa} 
              icon={showIniciativa ? <Users size={16} /> : <EyeOff size={16} />}
            />
            <VisibilityToggle 
              label="Lista de Jugadores" 
              isActive={showParticipants} 
              onToggle={onToggleParticipants} 
              icon={showParticipants ? <UserCircle size={16} /> : <EyeOff size={16} />}
            />
            <VisibilityToggle 
              label="Herramientas" 
              isActive={showToolbar} 
              onToggle={onToggleToolbar} 
              icon={showToolbar ? <Layout size={16} /> : <EyeOff size={16} />}
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-[var(--gold)]">
            <Shield size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isDM ? 'Modo DM Activo' : 'Preferencias Locales'}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {isDM 
              ? 'Como DM puedes gestionar la visibilidad de la interfaz para tu propia vista sin afectar a los jugadores.'
              : 'Configura qué elementos de la interfaz quieres ver. Estos ajustes solo se aplican a tu pantalla.'}
          </p>
        </div>
      </div>
      
      <div className="p-4 border-t border-white/10 bg-black/20">
        <p className="text-[8px] text-center text-muted-foreground uppercase tracking-widest opacity-50">
          GoRoll Battle Map v2.6
        </p>
      </div>
    </aside>
  );
};

const VisibilityToggle: React.FC<{
  label: string;
  isActive: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
}> = ({ label, isActive, onToggle, icon }) => (
  <button
    onClick={onToggle}
    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
      isActive 
        ? 'bg-white/5 border-white/10 text-white shadow-lg' 
        : 'bg-transparent border-transparent text-muted-foreground hover:bg-white/5'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`${isActive ? 'text-[var(--gold)]' : 'text-muted-foreground'}`}>
        {icon}
      </div>
      <span className="text-[11px] font-display uppercase tracking-wider">{label}</span>
    </div>
    <div className={`w-8 h-4 rounded-full relative transition-colors ${isActive ? 'bg-[var(--gold)]' : 'bg-white/10'}`}>
      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isActive ? 'left-4.5' : 'left-0.5'}`} style={{ left: isActive ? '1.125rem' : '0.125rem' }} />
    </div>
  </button>
);