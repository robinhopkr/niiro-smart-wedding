import { cn } from '@/lib/utils/cn'

interface RadioOption {
  value: string
  label: string
  description?: string
}

interface RadioGroupProps {
  name: string
  label: string
  options: RadioOption[]
  value?: string
  onChange: (value: string) => void
  error?: string | undefined
}

export function RadioGroup({ name, label, options, value, onChange, error }: RadioGroupProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-charcoal-700">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const checked = option.value === value

          return (
            <label
              key={option.value}
              className={cn(
                'flex min-h-11 cursor-pointer flex-col justify-center rounded-3xl border px-4 py-4 transition',
                checked
                  ? 'border-gold-500 bg-gold-100/80 text-charcoal-900 shadow-gold'
                  : 'border-cream-300 bg-white text-charcoal-700 hover:border-gold-300',
              )}
            >
              <input
                checked={checked}
                className="sr-only"
                name={name}
                type="radio"
                value={option.value}
                onChange={() => onChange(option.value)}
              />
              <span className="font-semibold">{option.label}</span>
              {option.description ? (
                <span className="mt-1 text-sm text-charcoal-500">{option.description}</span>
              ) : null}
            </label>
          )
        })}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </fieldset>
  )
}
