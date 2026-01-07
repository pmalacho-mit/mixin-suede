const format = (
  ...modifiers: ("red" | "green" | "blue" | "underlined" | "tab")[]
) => {
  const wrap = (text: string, code: string) => `\x1b[${code}m${text}\x1b[0m`;
  const codeByModifier = {
    red: "31",
    green: "32",
    blue: "34",
    underlined: "4",
  };
  const prefixes = {
    tab,
  };

  return (strings: TemplateStringsArray, ...values: any[]) => {
    let result = strings[0];
    for (let i = 0; i < values.length; i++)
      result += values[i] + strings[i + 1];
    for (const modifier of modifiers)
      result =
        modifier in codeByModifier
          ? wrap(
              result,
              codeByModifier[modifier as keyof typeof codeByModifier]
            )
          : modifier in prefixes
          ? prefixes[modifier as keyof typeof prefixes] + result
          : result;
    return result;
  };
};

const tab = " ".repeat(2);

export default Object.assign(format, { tab });
