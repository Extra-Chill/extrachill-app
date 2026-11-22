import { useMemo } from 'react';
import { useTheme } from 'wp-native-shell';
import Svg, { Path, Rect } from 'react-native-svg';
import { matrixPath, passURL, qrMatrix } from './model';

export function PassQR({ code }: { code: string }) {
    const theme = useTheme();
    const matrix = useMemo(() => qrMatrix(passURL(code)), [code]);
    const size = matrix.length + 8;
    // Use the theme's high-contrast button pair, including a four-module quiet zone.
    return <Svg width="100%" height={300} viewBox={`0 0 ${size} ${size}`} accessibilityLabel="Ticket QR pass">
        <Rect width={size} height={size} fill={theme.colors.onPrimary} />
        <Path d={matrixPath(matrix)} fill={theme.colors.primary} />
    </Svg>;
}
