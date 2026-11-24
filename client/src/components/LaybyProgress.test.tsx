import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LaybyProgress from './LaybyProgress'
import { makeLayby } from '../test/fixtures'

describe('LaybyProgress', () => {
  it('shows the next payment when everything is on time', () => {
    render(<LaybyProgress layby={makeLayby()} />)
    expect(screen.getByText(/next: r 300,00 due 24 jan 2027/i)).toBeInTheDocument()
  })

  it('shows the full amount that is late, not just the first instalment', () => {
    render(
      <LaybyProgress
        layby={makeLayby({ overdue: true, nextDue: { dueDate: '2026-10-09', amount: 270 }, overdueDue: { amount: 540, since: '2026-10-09' } })}
      />,
    )
    expect(screen.getByText(/r 540,00 overdue since 9 oct 2026/i)).toBeInTheDocument()
    expect(screen.queryByText(/next:/i)).not.toBeInTheDocument()
  })
})
