/** MCP tool error result — isError=true with structured message */
export function toolError(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ isError: true, message }) }],
    isError: true as const,
  };
}

/** MCP tool success result — structured JSON payload */
export function toolSuccess(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}
