import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/interactive';
import { Type, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function PwaInstallCard() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    queueMicrotask(() => setInstalled(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)));
    const appWindow = window as Window & { grateapexInstallPrompt?: InstallEvent };
    if (appWindow.grateapexInstallPrompt) queueMicrotask(() => setInstallEvent(appWindow.grateapexInstallPrompt ?? null));
    const onPrompt = (event: Event) => { event.preventDefault(); const prompt = event as InstallEvent; appWindow.grateapexInstallPrompt = prompt; setInstallEvent(prompt); };
    const onPromptReady = () => { if (appWindow.grateapexInstallPrompt) setInstallEvent(appWindow.grateapexInstallPrompt); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); delete appWindow.grateapexInstallPrompt; };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('grateapex-install-prompt', onPromptReady);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('grateapex-install-prompt', onPromptReady); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  if (installed) return null;
  async function install() {
    if (!installEvent) { setShowHelp(true); return; }
    await installEvent.prompt();
    if ((await installEvent.userChoice).outcome === 'accepted') { setInstallEvent(null); delete (window as Window & { grateapexInstallPrompt?: InstallEvent }).grateapexInstallPrompt; }
  }
  return <Card style={styles.card} tone="insight"><View style={styles.copy}><View style={styles.icon}><Icon name="sparkle" size={19} color={colors.primaryText} /></View><View style={styles.text}><Text style={styles.title}>Keep GrAte Apex Hub on your laptop</Text><Text style={styles.detail}>Install it from your browser for a separate app window and quick access from your desktop or dock.</Text></View></View><Button label={installEvent ? 'Install GrAte Apex Hub' : 'Show install steps'} variant="secondary" size="sm" onPress={() => void install()} />{showHelp ? <Text style={styles.help}>In Chrome or Edge, open the browser menu and choose “Install GrAte Apex Hub” or “Install this site as an app”. In Safari on Mac, choose File → Add to Dock.</Text> : null}</Card>;
}
function createStyles(colors: ThemeColors) { return StyleSheet.create({ card: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 15, marginTop: 24, padding: 20 }, copy: { flex: 1, minWidth: 270, flexDirection: 'row', alignItems: 'center', gap: 13 }, icon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' }, text: { flex: 1, gap: 4 }, title: { ...Type.headline, color: colors.text }, detail: { fontSize: 13, lineHeight: 19, color: colors.textSecondary }, help: { flexBasis: '100%', fontSize: 12, lineHeight: 18, color: colors.textSecondary } }); }
