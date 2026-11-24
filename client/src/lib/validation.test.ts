import { describe, it, expect } from 'vitest'
import { normaliseSaPhone, validateSignUp, validateLogIn, type SignUpValues } from './validation'

const goodCustomer: SignUpValues = {
  fullName: 'Thandi Mokoena',
  phone: '082 123 4567',
  email: 'thandi@example.com',
  password: 'secret123',
  role: 'customer',
  shopName: '',
  shopArea: '',
}

describe('normaliseSaPhone', () => {
  it('turns local SA cell numbers into +27 format', () => {
    expect(normaliseSaPhone('082 123 4567')).toBe('+27821234567')
    expect(normaliseSaPhone('82 123 4567')).toBe('+27821234567')
    expect(normaliseSaPhone('+27 82 123 4567')).toBe('+27821234567')
    expect(normaliseSaPhone('27821234567')).toBe('+27821234567')
  })

  it('rejects numbers that are not SA cell numbers', () => {
    expect(normaliseSaPhone('')).toBeNull()
    expect(normaliseSaPhone('12345')).toBeNull()
    expect(normaliseSaPhone('011 123 4567')).toBeNull() // landline
    expect(normaliseSaPhone('082 123 45678')).toBeNull() // too long
  })
})

describe('validateSignUp', () => {
  it('is happy with a complete customer', () => {
    expect(validateSignUp(goodCustomer)).toEqual({})
  })

  it('needs every field when the form is empty', () => {
    const errors = validateSignUp({
      ...goodCustomer,
      fullName: '',
      phone: '',
      email: '',
      password: '',
    })
    expect(Object.keys(errors).sort()).toEqual(['email', 'fullName', 'password', 'phone'])
  })

  it('wants a first and last name', () => {
    expect(validateSignUp({ ...goodCustomer, fullName: 'Thandi' }).fullName).toBeDefined()
  })

  it('wants a real looking email', () => {
    expect(validateSignUp({ ...goodCustomer, email: 'thandi@' }).email).toBeDefined()
  })

  it('wants a password of at least 6 characters', () => {
    expect(validateSignUp({ ...goodCustomer, password: '12345' }).password).toBeDefined()
    expect(validateSignUp({ ...goodCustomer, password: '123456' }).password).toBeUndefined()
  })

  it('does not ask customers for shop details', () => {
    const errors = validateSignUp(goodCustomer)
    expect(errors.shopName).toBeUndefined()
    expect(errors.shopArea).toBeUndefined()
  })

  it('asks shop owners for a shop name and area', () => {
    const errors = validateSignUp({ ...goodCustomer, role: 'owner' })
    expect(errors.shopName).toBeDefined()
    expect(errors.shopArea).toBeDefined()
    expect(
      validateSignUp({ ...goodCustomer, role: 'owner', shopName: 'Kasi Kids Wear', shopArea: 'Soweto' }),
    ).toEqual({})
  })
})

describe('validateLogIn', () => {
  it('needs an email and password', () => {
    expect(Object.keys(validateLogIn({ email: '', password: '' })).sort()).toEqual(['email', 'password'])
    expect(validateLogIn({ email: 'thandi@example.com', password: 'secret123' })).toEqual({})
  })
})
