import '@testing-library/jest-dom'

// jsdom does not implement URL.createObjectURL / revokeObjectURL.
// Provide minimal stubs so store actions that use them don't throw.
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = vi.fn()
}
