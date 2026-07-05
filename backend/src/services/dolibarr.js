const DEFAULT_BASE_URL = 'http://localhost/dolibarr/htdocs/api/index.php';

function formatApiError(data, status) {
  const stripHtml = (text) =>
    text.replace(/<[^>]*>/g, '').replace(/&(?:egrave|eacute|agrave|ocirc|uuml|nbsp);/gi, (entity) => {
      const map = { egrave: 'è', eacute: 'é', agrave: 'à', ocirc: 'ô', uuml: 'ü', nbsp: ' ' };
      return map[entity.slice(1, -1).toLowerCase()] || entity;
    });

  if (typeof data === 'object' && data?.error) {
    const err = data.error;
    if (typeof err === 'string') {
      return err;
    }

    const details = Object.entries(err)
      .filter(([key]) => key !== 'code' && key !== 'message')
      .map(([, value]) => value)
      .filter(Boolean)
      .join(' ; ');

    return details ? stripHtml(`${err.message}: ${details}`) : stripHtml(err.message);
  }

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  return `Erreur Dolibarr (${status})`;
}

export class DolibarrClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.DOLIBARR_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.apiKey = options.apiKey || process.env.DOLIBARR_API_KEY;
    this.defaultBankAccountId = Number(process.env.DOLIBARR_BANK_ACCOUNT_ID) || null;
    this._bankAccountCache = null;
  }

  async request(path, options = {}) {
    if (!this.apiKey) {
      throw new Error('DOLIBARR_API_KEY manquante');
    }

    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        DOLAPIKEY: this.apiKey,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });

    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      throw new Error(formatApiError(data, response.status));
    }

    return data;
  }

  status() {
    return this.request('/status');
  }

  listUsers(params = {}) {
    const query = new URLSearchParams({
      limit: String(params.limit ?? 100),
      sortfield: params.sortfield ?? 't.rowid',
      sortorder: params.sortorder ?? 'ASC',
    });

    if (params.sqlfilters) {
      query.set('sqlfilters', params.sqlfilters);
    }

    return this.request(`/users?${query.toString()}`);
  }

  async findUserByLogin(login) {
    const filter = `(t.login:=:'${login.replace(/'/g, "''")}')`;
    const users = await this.listUsers({ limit: 1, sqlfilters: filter });
    return users[0] || null;
  }

  async findUserByRefEmployee(refEmployee) {
    const filter = `(t.ref_employee:=:'${String(refEmployee).replace(/'/g, "''")}')`;
    const users = await this.listUsers({ limit: 1, sqlfilters: filter });
    return users[0] || null;
  }

  createUser(payload) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateUser(id, payload) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  listSalaries(params = {}) {
    const query = new URLSearchParams({
      limit: String(params.limit ?? 100),
      sortfield: params.sortfield ?? 't.rowid',
      sortorder: params.sortorder ?? 'ASC',
    });

    if (params.sqlfilters) {
      query.set('sqlfilters', params.sqlfilters);
    }

    return this.request(`/salaries?${query.toString()}`);
  }

  async findSalaryByRef(refSalary) {
    const ref = String(refSalary);
    const salaries = await this.listSalaries({ limit: 500 });
    return salaries.find((salary) => String(salary.ref) === ref) || null;
  }

  createSalary(payload) {
    return this.request('/salaries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateSalary(id, payload) {
    return this.request(`/salaries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  getSalary(id) {
    return this.request(`/salaries/${id}`);
  }

  listSalaryPayments(params = {}) {
    const query = new URLSearchParams({
      limit: String(params.limit ?? 100),
      sortfield: params.sortfield ?? 't.rowid',
      sortorder: params.sortorder ?? 'ASC',
    });

    return this.request(`/salaries/payments?${query.toString()}`);
  }

  async getDefaultBankAccountId() {
    if (this.defaultBankAccountId) {
      return this.defaultBankAccountId;
    }

    if (this._bankAccountCache) {
      return this._bankAccountCache;
    }

    try {
      const accounts = await this.request('/bankaccounts?limit=1');
      const accountId = accounts?.[0]?.id ? Number(accounts[0].id) : null;
      this._bankAccountCache = accountId;
      return accountId;
    } catch {
      return null;
    }
  }

  async addSalaryPayment(salaryId, payment) {
    const payload = {
      paiementtype: payment.paiementtype || 'LIQ',
      datepaye: payment.datepaye,
      chid: salaryId,
      amounts: {
        [String(salaryId)]: payment.amount,
      },
    };

    const accountId = await this.getDefaultBankAccountId();
    if (accountId) {
      payload.accountid = accountId;
    }

    return this.request(`/salaries/${salaryId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const dolibarr = new DolibarrClient();

export function dateToTimestamp(dateString) {
  return Math.floor(new Date(`${dateString}T12:00:00`).getTime() / 1000);
}
