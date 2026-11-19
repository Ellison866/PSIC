const cachedKey = {
  apiKey: null,
  expiresAt: 0,
};

class MindDoKeyError extends Error {
  constructor(message, fix, cause) {
    super(message);
    this.name = "MindDoKeyError";
    this.fix = fix;
    this.cause = cause;
  }
}

function configError(message) {
  return new MindDoKeyError(message, "Set KEYGEN_URL and KEYGEN_TOKEN in the server .env file.");
}

function getConfig() {
  const url = process.env.KEYGEN_URL;
  const token = process.env.KEYGEN_TOKEN;

  if (!url || url === "paste-here" || !token || token === "paste-here") {
    throw configError("The MindDo AI key service is not configured.");
  }

  return { url: url.replace(/\/$/, ""), token };
}

function clearCachedKey() {
  cachedKey.apiKey = null;
  cachedKey.expiresAt = 0;
}

function expiresAtMillis(value) {
  return typeof value === "number" ? value : Date.parse(value);
}

function isUsableCachedKey() {
  return cachedKey.apiKey && expiresAtMillis(cachedKey.expiresAt) > Date.now();
}

function readErrorBody(body, fallbackMessage) {
  const responseError = body && body.error;
  return {
    message: responseError?.message || body?.message || fallbackMessage,
    fix: responseError?.fix || body?.fix || "Check the MindDo key service and server configuration.",
  };
}

/**
 * Get a server-only OpenAI key from MindDo, reusing it until expiresAt.
 * Call invalidateKey() when OpenAI rejects the cached key as invalid.
 */
async function getKey({ forceRefresh = false } = {}) {
  if (!forceRefresh && isUsableCachedKey()) {
    return cachedKey.apiKey;
  }

  if (forceRefresh) {
    clearCachedKey();
  }

  const { url, token } = getConfig();
  let response;

  try {
    response = await fetch(`${url}/api/lookup-key`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  } catch (cause) {
    throw new MindDoKeyError(
      "The MindDo AI key service could not be reached.",
      "Check the network connection and KEYGEN_URL.",
      cause,
    );
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // The status code below still gives the server a safe error to show.
  }

  if (!response.ok || !body?.apiKey || !body?.expiresAt) {
    const error = readErrorBody(body, "MindDo did not return a usable AI key.");
    throw new MindDoKeyError(error.message, error.fix);
  }

  if (expiresAtMillis(body.expiresAt) <= Date.now()) {
    throw new MindDoKeyError(
      "MindDo returned an expired AI key.",
      "Check the MindDo key service and try again.",
    );
  }

  cachedKey.apiKey = body.apiKey;
  cachedKey.expiresAt = body.expiresAt;
  return cachedKey.apiKey;
}

/** Clear the cached key after OpenAI reports that it is invalid. */
function invalidateKey() {
  clearCachedKey();
}

/** Convert a key-service failure into the safe shape returned by the server. */
function toKeyErrorResponse(error) {
  return {
    error: {
      message: error?.message || "The AI key could not be retrieved.",
      fix: error?.fix || "Check the server configuration and try again.",
    },
  };
}

module.exports = { getKey, invalidateKey, toKeyErrorResponse };
