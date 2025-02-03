export const method = 'echo';

export const capability = {
  description: "Echoes back the received parameters",
  params: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Message to echo back"
      }
    }
  }
};

export function handler (params) {
  return params;
} 