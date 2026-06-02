import React from 'react';
import { Package, Sword, Trophy, FileText, Zap, Users } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-1 group w-14 h-full"
  >
    <div className="p-2 rounded-xl bg-white/5 group-hover:bg-[var(--gold)] group-hover:text-black transition-all duration-300 border border-white/5 group-active:scale-90">
      <Icon size={18} />
    </div>
    <span className="text-[7px] uppercase tracking-widest text-muted-foreground group-hover:text-[var(--gold)] font-display transition-colors">
      {label}
    </span>
  </button>
);

interface Props {
  onOpenSection: (section: string) => void;
  showSocial?: boolean;

}

export const BattleMapBottomBar: React.FC<Props> = ({ onOpenSection }) => {
  const { t } = useT();

  return (
    <div className="h-16 bg-[#0a0a0c]/90 border-t border-white/10 backdrop-blur-md px-4 flex items-center justify-between z-[60] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around w-full max-w-lg mx-auto h-full">
        <NavItem 
          icon={Package} 
          label={t('nav.backpack') || 'Mochila'} 
          onClick={() => onOpenSection('backpack')} 
        />
        <NavItem 
          icon={Sword} 
          label={t('nav.equipment') || 'Equipo'} 
          onClick={() => onOpenSection('equipment')} 
        />
        <NavItem 
          icon={Zap} 
          label={t('nav.skills') || 'Habs'} 
          onClick={() => onOpenSection('skills')} 
        />
        <NavItem 
          icon={Trophy} 
          label={t('nav.achievements') || 'Logros'} 
          onClick={() => onOpenSection('achievements')} 
        />
        <NavItem 
          icon={FileText} 
          label={t('nav.notes') || 'Notas'} 
          onClick={() => onOpenSection('notes')} 
        />
        <NavItem 
          icon={Users} 
          label={t('nav.social') || 'Social'} 
          onClick={() => onOpenSection('social')} 
        />
      </div>
    </div>
  );
};