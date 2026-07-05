# Client API Dolibarr

## Fonctionnalité

Classe centralisée pour appeler l’API REST Dolibarr avec la clé `DOLAPIKEY`.

## Code — requête HTTP générique

`backend/src/services/dolibarr.js` :

```javascript
export class DolibarrClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.DOLIBARR_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.apiKey = options.apiKey || process.env.DOLIBARR_API_KEY;
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
    let data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(formatApiError(data, response.status));
    }

    return data;
  }
}
```

## Code — employés

```javascript
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
```

## Code — salaires et paiements

```javascript
async findSalaryByRef(refSalary) {
  const ref = String(refSalary);
  const salaries = await this.listSalaries({ limit: 500 });
  return salaries.find((salary) => String(salary.ref) === ref) || null;
}

async addSalaryPayment(salaryId, payment) {
  const payload = {
    paiementtype: payment.paiementtype || 'LIQ',
    datepaye: payment.datepaye,
    chid: salaryId,
    amounts: { [String(salaryId)]: payment.amount },
  };

  return this.request(`/salaries/${salaryId}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
```

## Code — conversion date

```javascript
export function dateToTimestamp(dateString) {
  return Math.floor(new Date(`${dateString}T12:00:00`).getTime() / 1000);
}

export const dolibarr = new DolibarrClient();
```

## Fichiers touchés

| Fichier |
|---------|
| `backend/src/services/dolibarr.js` |
| `backend/.env` (`DOLIBARR_API_URL`, `DOLIBARR_API_KEY`) |

Utilisé par : `csvEmployeeImport.js`, `csvSalaryImport.js`, `employeeService.js`, `salaryService.js`, `employeeSalaryHistoryService.js`
