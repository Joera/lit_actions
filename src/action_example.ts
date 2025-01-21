const _litActionCode = async () => {
    // @ts-ignore
    if (magicNumber >= 42) {
        // @ts-ignore
        LitActions.setResponse({ response:"The number is greater than or equal to 42!" });
    } else {
        // @ts-ignore
        LitActions.setResponse({ response: "The number is less than 42!" });
    }
}

export const litActionCode = `(${_litActionCode.toString()})();`;


