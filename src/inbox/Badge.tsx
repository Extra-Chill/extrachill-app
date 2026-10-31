import { Text } from 'react-native';
import { useTheme } from 'wp-native-shell';
import { useInbox } from './context';

export function InboxBadge() {
    const { count } = useInbox();
    const theme = useTheme();
    return count > 0 ? <Text accessibilityLabel={`${count} unread notifications`} style={{ color: theme.colors.primary, fontWeight: '700', paddingHorizontal: 6 }}>{count > 99 ? '99+' : count}</Text> : null;
}
