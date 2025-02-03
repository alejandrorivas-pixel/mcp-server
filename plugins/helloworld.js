export const method = 'helloworld';

export const capability = {
  description: "Returns a hello world message",
  params: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name to greet (optional)",
        default: "World"
      }
    }
  }
};

export function handler (params = {}) {
  const name = params.name || "World";
  return {
    message: `Hello, ${name}!`
  };
} 