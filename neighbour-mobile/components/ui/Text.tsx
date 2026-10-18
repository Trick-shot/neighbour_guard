import {Text as RNText, TextProps} from 'react-native';

import {type as typeStyles, TypeName, useColors} from '@/theme';

type Props = TextProps & { variant?: TypeName; color?: string };

/** Text in one of the Figma text styles. Colour defaults to text/primary. */
export default function Text({variant = 'body', color, style, ...rest}: Props) {
    const colors = useColors();
    return <RNText {...rest} style={[typeStyles[variant], {color: color ?? colors.text.primary}, style]}/>;
}
