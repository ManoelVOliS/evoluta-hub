const BASE = '/api'

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
})

const req = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined
  })
  if (res.status === 401) {
    const body = await res.json().catch(() => ({}))
    if (body.expired) sessionStorage.setItem('auth_msg', 'Sua sessão expirou. Faça login novamente.')
    localStorage.removeItem('token')
    window.location.href = '/login'
    return
  }
  return res.json()
}

export const api = {
  login:  (password) => req('POST', '/auth/login', { password }),
  backlog: {
    list:   () => req('GET', '/backlog'),
    create: (d) => req('POST', '/backlog', d),
    update: (id, d) => req('PUT', `/backlog/${id}`, d),
    delete: (id) => req('DELETE', `/backlog/${id}`),
  },
  plan: {
    list:   () => req('GET', '/plan'),
    create: (d) => req('POST', '/plan', d),
    update: (id, d) => req('PUT', `/plan/${id}`, d),
    delete: (id) => req('DELETE', `/plan/${id}`),
  },
  trl: {
    get:    () => req('GET', '/trl'),
    update: (d) => req('PUT', '/trl', d),
  },
  content: {
    list:   () => req('GET', '/content'),
    get:    (f) => req('GET', `/content/${f}`),
    save:   (f, content) => req('PUT', `/content/${f}`, { content }),
    create: (f, content) => req('POST', `/content/${f}`, { content }),
    delete: (f) => req('DELETE', `/content/${f}`),
  },
  metrics: {
    get:     () => req('GET', '/metrics'),
    update:  (d) => req('PUT', '/metrics', d),
    history: () => req('GET', '/metrics/history'),
  },
  clients: {
    list:          ()        => req('GET', '/clients'),
    reportsSummary:()        => req('GET', '/clients/reports-summary'),
    create: (d)       => req('POST', '/clients', d),
    update: (id, d)   => req('PUT', `/clients/${id}`, d),
    delete: (id)      => req('DELETE', `/clients/${id}`),
    reports: {
      list:   (cid)           => req('GET', `/clients/${cid}/reports`),
      get:    (cid, rid)      => req('GET', `/clients/${cid}/reports/${rid}`),
      save:   (cid, d)        => req('POST', `/clients/${cid}/reports`, d),
      update: (cid, rid, body) => req('PUT',   `/clients/${cid}/reports/${rid}`, typeof body === 'string' ? { html: body } : body),
      status: (cid, rid, s)   => req('PATCH', `/clients/${cid}/reports/${rid}/status`, { status: s }),
      delete: (cid, rid)      => req('DELETE', `/clients/${cid}/reports/${rid}`),
    }
  },
  prospects: {
    list:   ()       => req('GET', '/prospects'),
    create: (d)      => req('POST', '/prospects', d),
    update: (id, d)  => req('PUT', `/prospects/${id}`, d),
    delete: (id)     => req('DELETE', `/prospects/${id}`),
  },
  calendar: {
    list:   (year, month) => req('GET', `/calendar?year=${year}&month=${month}`),
    create: (d)           => req('POST', '/calendar', d),
    update: (id, d)       => req('PUT', `/calendar/${id}`, d),
    delete: (id)          => req('DELETE', `/calendar/${id}`),
  },
  benchmark: {
    list:   ()    => req('GET',  '/benchmark'),
    get:    (mes) => req('GET',  `/benchmark/${mes}`),
    gerar:  (mes) => req('POST', '/benchmark/gerar', { mes }),
  },
}
