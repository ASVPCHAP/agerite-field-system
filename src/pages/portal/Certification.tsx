import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import type { CertificationModule } from '../../data/schema'
import { listCertificationModules, submitCertificationAttempt } from '../../data/store'
import { Pill, SectionHeading } from '../../components/ui'

export function Certification() {
  const { currentRep, refreshCurrentRep } = useAuth()
  const [modules, setModules] = useState<CertificationModule[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean } | null>(null)

  useEffect(() => {
    listCertificationModules().then(setModules)
  }, [])

  const module = modules[0]
  if (!currentRep || !module) return null

  const certified = currentRep.cert_status === 'certified'

  async function handleSubmit() {
    if (!currentRep || !module) return
    const answerArray = module.questions.map((_, i) => answers[i] ?? -1)
    const attempt = await submitCertificationAttempt(currentRep.id, module.id, answerArray)
    setResult({ score: attempt.score, total: module.questions.length, passed: attempt.passed })
    await refreshCurrentRep()
  }

  return (
    <div>
      <SectionHeading>Certification</SectionHeading>
      <p className="mt-2 text-sm text-[var(--surface-ink-soft)]">
        Module 1 — {module.title}. Status:{' '}
        <Pill tone={certified ? 'pass' : 'review'}>{currentRep.cert_status.replace('_', ' ')}</Pill>
      </p>

      {certified ? (
        <p className="mt-6 font-mono text-sm text-[var(--surface-teal)]">
          Certified — module complete.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {module.questions.map((q, i) => (
            <div key={i} className="rounded-sm border border-[var(--surface-line)] p-4">
              <p className="font-medium">
                {i + 1}. {q.prompt}
              </p>
              <div className="mt-2 space-y-1">
                {q.options.map((opt, j) => (
                  <label key={j} className="block text-sm">
                    <input
                      type="radio"
                      name={`q${i}`}
                      checked={answers[i] === j}
                      onChange={() => setAnswers((a) => ({ ...a, [i]: j }))}
                      className="mr-2"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-full bg-[var(--surface-teal)] px-5 py-2 text-sm text-white"
          >
            Submit
          </button>
          {result && (
            <p
              className={`font-mono text-sm ${
                result.passed ? 'text-[var(--surface-teal)]' : 'text-[var(--surface-vermilion)]'
              }`}
            >
              {result.score}/{result.total} correct —{' '}
              {result.passed ? 'passed, certification updated.' : 'not passed yet, try again.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
