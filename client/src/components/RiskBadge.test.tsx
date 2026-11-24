import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RiskBadge from './RiskBadge'

describe('RiskBadge', () => {
  it('shows the level in its own colour', () => {
    render(<RiskBadge risk={{ level: 'high', reasons: ['2 instalments missed', '40 days overdue'] }} />)
    const badge = screen.getByText('High risk')
    expect(badge).toHaveClass('bg-red-600')
    // the reasons are there for a tap/hover and for screen readers
    expect(badge).toHaveAttribute('title', '2 instalments missed, 40 days overdue')
  })

  it('has a colour for low and medium too', () => {
    render(
      <>
        <RiskBadge risk={{ level: 'low', reasons: [] }} />
        <RiskBadge risk={{ level: 'medium', reasons: ['1 instalment missed'] }} />
      </>,
    )
    expect(screen.getByText('Low risk')).toHaveClass('bg-brand-light')
    expect(screen.getByText('Medium risk')).toHaveClass('bg-gold-light')
  })

  it('shows nothing when there is no score', () => {
    const { container } = render(<RiskBadge risk={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
