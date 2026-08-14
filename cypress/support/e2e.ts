export const USERS = {
  admin: 'alice.thompson@company.com',
  manager: 'bob.mitchell@company.com',
  employee: 'david.jones@company.com',
} as const

const PASSWORD = 'Password123!'

export function login(email: string, landsOn: string): void {
  cy.visit('/login')
  cy.get('#email').type(email)
  cy.get('#password').type(PASSWORD)
  cy.contains('button', 'Sign in').click()
  cy.url().should('include', landsOn)
}

export function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const testId = el.getAttribute('data-testid')
  const text = el.textContent?.trim().slice(0, 24) ?? ''
  return `${tag}${id}${testId ? `[${testId}]` : ''}${text ? ` "${text}"` : ''}`
}

function hasScrollingAncestor(el: Element, doc: Document): boolean {
  const view = doc.defaultView!
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node === doc.documentElement || node === doc.body) return false
    const overflowX = view.getComputedStyle(node).overflowX
    if (overflowX !== 'visible') return true
  }
  return false
}

function overflowingElements(doc: Document): string[] {
  const limit = doc.documentElement.clientWidth
  return Array.from(doc.querySelectorAll('body *'))
    .filter((el) => {
      const rect = el.getBoundingClientRect()
      return (
        rect.width > 0 &&
        Math.ceil(rect.right) > limit + 1 &&
        !hasScrollingAncestor(el, doc)
      )
    })
    .sort(
      (a, b) =>
        b.getBoundingClientRect().right - a.getBoundingClientRect().right
    )
    .slice(0, 5)
    .map(
      (el) =>
        `${describeElement(el)} reaches ${Math.round(el.getBoundingClientRect().right)}px`
    )
}

export function assertNoHorizontalScroll(): void {
  cy.document().then((doc) => {
    expect(
      doc.body.scrollWidth,
      `content is wider than the viewport; widest elements: ${overflowingElements(doc).join(' | ')}`
    ).to.be.at.most(doc.documentElement.clientWidth)
  })
}
