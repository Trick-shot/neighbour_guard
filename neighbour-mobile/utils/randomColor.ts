// utils/randomColor.ts
export const getRandomColor = (): string => {
    const colors = [
        "#4A90E2",  // blue
        "#E24A4A",  // red
        "#E2A44A",  // orange
        "#A44AE2",  // purple
        "#4AE2B5",  // teal
        "#E24AA4",  // pink
        "#E2E24A",  // yellow
        "#4AE24A",  // lime
        "#4A4AE2",  // indigo
        "#E27B4A",  // coral
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};