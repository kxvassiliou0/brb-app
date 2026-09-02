import {
  backgroundBehind,
  contrast,
  DESKTOP,
  describeElement,
  login,
  NARROW,
  tab,
  USERS,
  WCAG_143_TEXT_MINIMUM,
  WCAG_1411_BOUNDARY_MINIMUM,
} from '../support/e2e'

const TAB_DEPTH = 25

const LARGE_TEXT_PX = 18.66

const STICKY_POSITIONS = ['sticky', 'fixed']

function focusOrder(depth: number): Cypress.Chainable<string[]> {
  const seen: string[] = []
  for (let index = 0; index < depth; index += 1) {
    tab()
    cy.document().then((doc) => {
      const active = doc.activeElement
      if (active && active !== doc.body) seen.push(describeElement(active))
    })
  }
  return cy.wrap(seen, { log: false })
}

function assertFocusedElementIsReachable() {
  cy.document().then((doc) => {
    const active = doc.activeElement
    if (!active || active === doc.body) return

    const rect = active.getBoundingClientRect()
    const view = doc.defaultView!
    expect(
      rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= view.innerHeight &&
        rect.right <= view.innerWidth,
      `${describeElement(active)} is scrolled inside the viewport`
    ).to.equal(true)

    const points: [number, number][] = [
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
      [rect.left + 2, rect.top + 2],
      [rect.right - 2, rect.bottom - 2],
    ]
    const visible = points.some(([x, y]) => {
      const hit = doc.elementFromPoint(x, y)
      return hit !== null && (active.contains(hit) || hit.contains(active))
    })
    expect(
      visible,
      `${describeElement(active)} is not fully covered by sticky content`
    ).to.equal(true)
  })
}

function assertTextContrast() {
  cy.document().then((doc) => {
    const view = doc.defaultView!
    const failures = Array.from(doc.querySelectorAll('body *'))
      .filter((el) => {
        const text = Array.from(el.childNodes).some(
          (node) => node.nodeType === 3 && node.textContent?.trim()
        )
        if (!text) return false
        const style = view.getComputedStyle(el)
        if (style.visibility === 'hidden' || style.display === 'none')
          return false
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })
      .map((el) => {
        const style = view.getComputedStyle(el)
        const size = Number.parseFloat(style.fontSize)
        const bold = Number(style.fontWeight) >= 700
        const large = size >= 24 || (size >= LARGE_TEXT_PX && bold)
        const ratio = contrast(style.color, backgroundBehind(el, view))
        const minimum = large
          ? WCAG_1411_BOUNDARY_MINIMUM
          : WCAG_143_TEXT_MINIMUM
        return { el, ratio, minimum }
      })
      .filter(({ ratio, minimum }) => ratio < minimum)
      .slice(0, 8)
      .map(
        ({ el, ratio, minimum }) =>
          `${describeElement(el)} at ${ratio.toFixed(2)}:1 needs ${minimum}:1`
      )

    expect(failures, 'text below its contrast minimum').to.deep.equal([])
  })
}

function assertControlBoundaryContrast() {
  cy.document().then((doc) => {
    const view = doc.defaultView!
    const failures = Array.from(doc.querySelectorAll('input, select, textarea'))
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map((el) => {
        const style = view.getComputedStyle(el)
        const ratio = contrast(
          style.borderTopColor,
          backgroundBehind(el.parentElement ?? el, view)
        )
        return { el, ratio, colour: style.borderTopColor }
      })
      .filter(({ ratio }) => ratio < WCAG_1411_BOUNDARY_MINIMUM)
      .map(
        ({ el, ratio, colour }) =>
          `${describeElement(el)} boundary ${colour} at ${ratio.toFixed(2)}:1`
      )

    expect(failures, 'control boundaries below 3:1').to.deep.equal([])
  })
}

describe('WCAG 2.4.3 focus order', () => {
  it('follows the visual order of the shell on a desktop viewport', () => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    login(USERS.manager, '/')
    cy.get('[data-testid="sidebar"]').should('be.visible')

    cy.get('body').click(0, 0)
    focusOrder(6).then((order) => {
      expect(order.length, 'focus lands on controls').to.be.greaterThan(0)
      const sidebarFirst = order.findIndex((entry) =>
        entry.includes('Dashboard')
      )
      const breadcrumbFirst = order.findIndex((entry) =>
        entry.includes('sidebar-toggle')
      )
      expect(
        sidebarFirst,
        `sidebar links come before the main content: ${order.join(' -> ')}`
      ).to.be.lessThan(breadcrumbFirst === -1 ? Infinity : breadcrumbFirst)
    })
  })

  it('reaches the bottom bar after the page content on a narrow viewport', () => {
    cy.viewport(NARROW.width, NARROW.height)
    login(USERS.employee, '/')
    cy.get('[data-testid="bottom-nav"]').should('be.visible')

    cy.get('body').click(0, 0)
    focusOrder(TAB_DEPTH).then((order) => {
      const firstNav = order.findIndex((entry) => entry.includes('Home'))
      const firstContent = order.findIndex((entry) =>
        entry.includes('sidebar-toggle')
      )
      expect(firstNav, 'the bottom bar is reachable by keyboard').to.not.equal(
        -1
      )
      expect(
        firstNav,
        `the bottom bar sits last visually, so it must not take focus first: ${order.join(' -> ')}`
      ).to.be.greaterThan(firstContent)
    })
  })
})

describe('WCAG 2.4.11 focus not obscured', () => {
  it('keeps every focus stop clear of the sticky sidebar', () => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    login(USERS.manager, '/')
    cy.get('body').click(0, 0)

    for (let index = 0; index < TAB_DEPTH; index += 1) {
      tab()
      assertFocusedElementIsReachable()
    }
  })

  it('keeps every focus stop clear of the sticky bottom bar', () => {
    cy.viewport(NARROW.width, NARROW.height)
    login(USERS.employee, '/')
    cy.get('body').click(0, 0)

    for (let index = 0; index < TAB_DEPTH; index += 1) {
      tab()
      assertFocusedElementIsReachable()
    }
  })

  it('holds the navigation and bottom bar as the only sticky surfaces', () => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    login(USERS.manager, '/')
    cy.document().then((doc) => {
      const view = doc.defaultView!
      const sticky = Array.from(doc.querySelectorAll('body *'))
        .filter((el) =>
          STICKY_POSITIONS.includes(view.getComputedStyle(el).position)
        )
        .map(describeElement)
      expect(
        sticky.length,
        `sticky surfaces: ${sticky.join(' | ')}`
      ).to.be.at.most(2)
    })
  })
})

describe('WCAG 2.1.2 no keyboard trap', () => {
  it('holds focus inside the booking dialog and releases it on close', () => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    login(USERS.employee, '/')

    cy.contains('button', 'Book time off').first().click()
    cy.get('[data-testid="modal"]').should('be.visible')

    for (let index = 0; index < TAB_DEPTH; index += 1) {
      tab()
      cy.document().then((doc) => {
        const modal = doc.querySelector('[data-testid="modal"]')
        expect(
          modal?.contains(doc.activeElement),
          `focus stayed in the dialog, reached ${describeElement(doc.activeElement ?? doc.body)}`
        ).to.equal(true)
      })
    }

    cy.get('body').type('{esc}')
    cy.get('[data-testid="modal"]').should('not.exist')
    cy.document().then((doc) => {
      expect(
        doc.activeElement?.textContent,
        'focus returns to the control that opened the dialog'
      ).to.contain('Book time off')
    })
  })

  it('lets the keyboard leave the date picker without a mouse', () => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    login(USERS.employee, '/')

    cy.contains('button', 'Book time off').first().click()
    cy.get('#start-date').click()
    cy.get('[data-testid="start-date-calendar"]').should('be.visible')

    cy.get('body').type('{esc}')
    cy.get('[data-testid="start-date-calendar"]').should('not.exist')
  })
})

describe('WCAG 3.3.8 accessible authentication', () => {
  it('accepts a pasted password rather than forcing it to be typed', () => {
    cy.visit('/login')
    cy.get('#password').then(($input) => {
      const input = $input[0] as HTMLInputElement
      const pasted = new DataTransfer()
      pasted.setData('text/plain', 'Password123!')
      const event = new ClipboardEvent('paste', {
        clipboardData: pasted,
        bubbles: true,
        cancelable: true,
      })
      const delivered = input.dispatchEvent(event)
      expect(delivered, 'the paste event is not cancelled').to.equal(true)
    })

    cy.get('#password').invoke('val', 'Password123!').trigger('input')
    cy.get('#password').should('have.value', 'Password123!')
  })

  it('names both fields so a password manager can fill them', () => {
    cy.visit('/login')
    cy.get('#email').should('have.attr', 'autocomplete', 'email')
    cy.get('#password').should('have.attr', 'autocomplete', 'current-password')
    cy.get('#password').should('have.attr', 'type', 'password')
  })
})

describe('WCAG 3.3.7 redundant entry', () => {
  it('carries the calendar selection into the booking dialog', () => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    login(USERS.manager, '/')
    cy.visit('/team-calendar')
    cy.get('[data-testid="screen-team-calendar"]').should('be.visible')

    cy.get('[data-testid="calendar-day"]').eq(8).click()
    cy.get('[data-testid="calendar-day"]').eq(10).click()

    cy.get('[data-testid="modal"]').should('be.visible')
    cy.get('#start-date').should('not.contain', 'Select start date')
    cy.get('#end-date').should('not.contain', 'Select end date')
  })

  it('prefills the booking dialog with the signed-in person', () => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    login(USERS.admin, '/')
    cy.contains('button', 'Book time off').first().click()
    cy.get('#booking-employee').should('not.have.value', '')
  })
})

describe('WCAG 2.5.7 dragging movements', () => {
  it('selects a calendar range with single clicks and no drag', () => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    login(USERS.manager, '/')
    cy.visit('/team-calendar')

    cy.get('[data-testid="selection-status"]').should(
      'contain',
      'Select a start date'
    )
    cy.get('[data-testid="calendar-day"]').eq(8).click()
    cy.get('[data-testid="selection-status"]').should('contain', 'selected')
    cy.get('[data-testid="calendar-day"]').eq(10).click()
    cy.get('[data-testid="modal"]').should('be.visible')
  })

  it('exposes no draggable control anywhere on the calendar', () => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    login(USERS.manager, '/')
    cy.visit('/team-calendar')
    cy.get('[data-testid="screen-team-calendar"]').should('be.visible')

    cy.get('[draggable="true"]').should('not.exist')
  })
})

describe('WCAG 1.4.3 and 1.4.11 contrast in the browser', () => {
  const screens: [string, string, string][] = [
    [USERS.employee, '/', 'screen-employee-dashboard'],
    [USERS.employee, '/requests', 'screen-requests'],
    [USERS.employee, '/settings', 'screen-settings'],
    [USERS.manager, '/', 'screen-manager-dashboard'],
    [USERS.manager, '/team-calendar', 'screen-team-calendar'],
    [USERS.admin, '/', 'screen-admin-dashboard'],
    [USERS.admin, '/employees', 'screen-employees'],
    [USERS.admin, '/departments', 'screen-departments'],
  ]

  it('holds every rendered text run against its real background', () => {
    cy.viewport(DESKTOP.width, DESKTOP.height)
    let signedInAs = ''
    for (const [user, path, testId] of screens) {
      if (user !== signedInAs) {
        login(user, '/')
        signedInAs = user
      }
      cy.visit(path)
      cy.get(`[data-testid="${testId}"]`).should('be.visible')
      assertTextContrast()
    }
  })

  it('bounds every form control at 3:1 against its surface', () => {
    cy.visit('/login')
    cy.get('[data-testid="screen-login"]').should('be.visible')
    assertControlBoundaryContrast()

    login(USERS.employee, '/')
    cy.contains('button', 'Book time off').first().click()
    cy.get('[data-testid="modal"]').should('be.visible')
    assertControlBoundaryContrast()
  })
})
