type JsonBody = Record<string, unknown> | unknown[]

type JsonOptions = {
  status?: number
  headers?: Record<string, string>
}

const baseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
}

export function json(body: JsonBody, options: JsonOptions = {}): Response {
  const { status = 200, headers = {} } = options
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...baseHeaders, ...headers },
  })
}

export function jsonOk(body: JsonBody, headers?: Record<string, string>) {
  return json(body, {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600', ...headers },
  })
}

export function jsonBadRequest(code: string, message: string) {
  return json({ code, message }, { status: 400 })
}

export function jsonNotFound(code: string, message: string) {
  return json({ code, message }, { status: 404 })
}

export function jsonError(code: string, message: string) {
  return json({ code, message }, { status: 500 })
}


