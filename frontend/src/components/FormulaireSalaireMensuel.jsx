import { MOIS_OPTIONS } from '../constants/mois';



export default function FormulaireSalaireMensuel({ form, onChange }) {

  return (

    <>

      <div className="bulk-salary-salary-grid">

        <div className="bulk-salary-field">

          <label htmlFor="month">Mois</label>

          <select id="month" name="month" value={form.month} onChange={onChange} required>

            {MOIS_OPTIONS.map((month) => (

              <option key={month.value} value={month.value}>

                {month.label}

              </option>

            ))}

          </select>

        </div>



        <div className="bulk-salary-field">

          <label htmlFor="year">Année</label>

          <input

            id="year"

            name="year"

            type="number"

            min="2000"

            max="2100"

            value={form.year}

            onChange={onChange}

            required

          />

        </div>



        <div className="bulk-salary-field">

          <label htmlFor="salary_per_day">Salaire par jour</label>

          <input

            id="salary_per_day"

            name="salary_per_day"

            type="number"

            min="0"

            step="0.01"

            value={form.salary_per_day}

            onChange={onChange}

            placeholder="10"

            required

          />

        </div>

      </div>



      <div className="bulk-salary-weekend-options">

        <label className="bulk-salary-checkbox">

          <input

            type="checkbox"

            name="worked_saturday"

            checked={form.worked_saturday}

            onChange={onChange}

          />

          Samedi travaillé (jour non ouvrable, ×3 si coché)

        </label>

        <label className="bulk-salary-checkbox">

          <input

            type="checkbox"

            name="worked_sunday"

            checked={form.worked_sunday}

            onChange={onChange}

          />

          Dimanche travaillé (jour non ouvrable, ×3 si coché)

        </label>

      </div>

    </>

  );

}

