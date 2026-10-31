import { DrawerContentScrollView, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { Pressable, Text } from 'react-native';
import { useAuth, useNavigationConfig, useTheme } from 'wp-native-shell';
import { InboxBadge } from './Badge';

// The shell drawer does not expose an item/badge slot; preserve its config-driven sections.
export function InboxDrawerContent(props: DrawerContentComponentProps) {
    const { navigation } = useNavigationConfig();
    const auth = useAuth();
    const theme = useTheme();
    return <DrawerContentScrollView {...props} style={{ backgroundColor: theme.colors.surface }}>
        {navigation.sections.filter(section => !section.visibleWhen || section.visibleWhen(auth)).map(section => (
            <Pressable key={section.id} accessibilityRole="button" onPress={() => props.navigation.navigate(section.id)} style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg }}>
                <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamily, fontWeight: '600', fontSize: theme.typography.fontSizes.base }}>{section.label}</Text>
                {section.id === 'inbox' ? <InboxBadge /> : null}
            </Pressable>
        ))}
    </DrawerContentScrollView>;
}
