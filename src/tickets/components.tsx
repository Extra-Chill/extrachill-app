import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { matrixPath, passURL, qrMatrix } from './model';

export function PassQR({ code }: { code: string }) {
    const matrix = useMemo(() => qrMatrix(passURL(code)), [code]);
    const size = matrix.length + 8;
    // Door scanners need dark modules on a light field in every app theme
    // (dark mode included), so the pass QR is fixed black on white, with a
    // four-module quiet zone.
    return <Svg width="100%" height={300} viewBox={`0 0 ${size} ${size}`} accessibilityLabel="Ticket QR pass">
        <Rect width={size} height={size} fill="#ffffff" />
        <Path d={matrixPath(matrix)} fill="#000000" />
    </Svg>;
}
