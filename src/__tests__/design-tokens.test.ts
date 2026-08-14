import { readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  breakpointTokens,
  color,
  colorTokens,
  contrastRatio,
  css,
  fontTokens,
  readFile,
  remToPx,
} from '@/test/tokens'
import { BREAKPOINTS } from '@/lib/breakpoints'

const BACKGROUND_TOKENS = {
  'background-primary': '#f6f4ee',
  'background-secondary': '#ffffff',
  'background-tertiary': '#e4e4e9',
} as const

const TEXT_TOKENS = {
  'text-primary': '#111115',
  'text-secondary': '#6b6557',
  'text-tertiary': '#17160f',
} as const

const INTERACTIVE_TOKENS = {
  'interactive-primary': '#111115',
  'interactive-hover': '#222227',
  'interactive-text': '#ffffff',
} as const

const BORDER_TOKENS = {
  'border-primary': '#e7e3d8',
  'border-interactive': '#6b6557',
} as const

const SAGE_TOKENS = {
  'sage-background': '#e5ebdd',
  'sage-foreground': '#3e5136',
} as const

const PENDING_TOKENS = {
  'pending-background': '#f5ecd9',
  'pending-foreground': '#6c511c',
} as const

const ERROR_TOKENS = {
  'error-background': '#f2e2dd',
  'error-foreground': '#7c2e20',
} as const

const FOCUS_TOKENS = {
  'focus-ring': '#3e5136',
} as const

const DESIGN_TOKENS = {
  ...BACKGROUND_TOKENS,
  ...TEXT_TOKENS,
  ...INTERACTIVE_TOKENS,
  ...BORDER_TOKENS,
  ...SAGE_TOKENS,
  ...PENDING_TOKENS,
  ...ERROR_TOKENS,
  ...FOCUS_TOKENS,
}

const BACKGROUNDS = Object.keys(BACKGROUND_TOKENS)

const TEXT_ON_BACKGROUND_PAIRS = BACKGROUNDS.flatMap((background) =>
  Object.keys(TEXT_TOKENS).map(
    (foreground) => [foreground, background] as [string, string]
  )
)

const SEMANTIC_PAIRS: [string, string][] = [
  ['interactive-text', 'interactive-primary'],
  ['interactive-text', 'interactive-hover'],
  ['sage-foreground', 'sage-background'],
  ['pending-foreground', 'pending-background'],
  ['error-foreground', 'error-background'],
]

const BOUNDARY_PAIRS = BACKGROUNDS.flatMap((background) =>
  ['border-interactive', 'focus-ring'].map(
    (boundary) => [boundary, background] as [string, string]
  )
)

describe('design tokens', () => {
  it.each(Object.entries(DESIGN_TOKENS))(
    'resolves --color-%s to %s',
    (name, expected) => {
      expect(color(name)).toBe(expected)
    }
  )

  it('declares exactly the design system colour tokens', () => {
    expect(Object.keys(colorTokens).sort()).toEqual(
      Object.keys(DESIGN_TOKENS).sort()
    )
  })
})

describe('breakpoints', () => {
  it('declares exactly the four named breakpoints', () => {
    expect(Object.keys(breakpointTokens).sort()).toEqual([
      'lg',
      'md',
      'sm',
      'xl',
    ])
  })

  it.each(Object.entries(BREAKPOINTS))(
    'resolves --breakpoint-%s to %s',
    (name, expected) => {
      expect(breakpointTokens[name]).toBe(expected)
    }
  )

  it('states every breakpoint in rem so they track the root font size', () => {
    for (const value of Object.values(breakpointTokens)) {
      expect(value).toMatch(/rem$/)
    }
  })

  it('orders the breakpoints from narrowest to widest', () => {
    const widths = Object.values(BREAKPOINTS).map(remToPx)
    expect(widths).toEqual([...widths].sort((a, b) => a - b))
  })
})

describe('typography', () => {
  it('applies Schibsted Grotesk as the sans family', () => {
    expect(fontTokens['sans']).toContain("'Schibsted Grotesk'")
  })

  it('applies Source Serif 4 as the serif family', () => {
    expect(fontTokens['serif']).toContain("'Source Serif 4'")
  })

  it('loads both families from Google Fonts', () => {
    const href = readFile('index.html').match(
      /href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/
    )?.[1]
    expect(href).toBeDefined()
    expect(href).toContain('family=Schibsted+Grotesk')
    expect(href).toContain('family=Source+Serif+4')
  })

  it('sets the body to sans and headings to serif', () => {
    const body = css.match(/\bbody\s*\{([^}]*)\}/)?.[1]
    expect(body).toContain('font-family: var(--font-sans)')
    const headings = css.match(/h1,[\s\S]*?h6\s*\{([^}]*)\}/)?.[1]
    expect(headings).toContain('font-family: var(--font-serif)')
  })
})

describe('WCAG 1.4.3 text contrast', () => {
  it.each([...TEXT_ON_BACKGROUND_PAIRS, ...SEMANTIC_PAIRS])(
    '%s on %s meets 4.5:1',
    (foreground, background) => {
      const ratio = contrastRatio(color(foreground), color(background))
      expect(
        ratio,
        `${foreground} on ${background} is ${ratio.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(4.5)
    }
  )
})

describe('WCAG 1.4.11 non-text contrast', () => {
  it.each(BOUNDARY_PAIRS)('%s on %s meets 3:1', (boundary, background) => {
    const ratio = contrastRatio(color(boundary), color(background))
    expect(
      ratio,
      `${boundary} on ${background} is ${ratio.toFixed(2)}:1`
    ).toBeGreaterThanOrEqual(3)
  })

  it('holds border-interactive at 4.57:1 against its weakest background', () => {
    const worst = Math.min(
      ...BACKGROUNDS.map((b) =>
        contrastRatio(color('border-interactive'), color(b))
      )
    )
    expect(worst).toBeCloseTo(4.57, 2)
  })

  it('holds focus-ring at 6.81:1 against its weakest background', () => {
    const worst = Math.min(
      ...BACKGROUNDS.map((b) => contrastRatio(color('focus-ring'), color(b)))
    )
    expect(worst).toBeCloseTo(6.81, 2)
  })
})

describe('focus indicator', () => {
  it('renders a 3px outline with 2px offset from the focus-ring token', () => {
    const rule = css.match(/:focus-visible\s*\{([^}]*)\}/)?.[1]
    expect(rule).toContain('outline: 3px solid var(--color-focus-ring)')
    expect(rule).toContain('outline-offset: 2px')
  })

  it('bounds inputs and selects with the border-interactive token', () => {
    const rule = css.match(/input,\s*select,\s*textarea\s*\{([^}]*)\}/)?.[1]
    expect(rule).toContain('var(--color-border-interactive)')
  })
})

describe('component code', () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = `${dir}/${entry}`
      if (statSync(path).isDirectory()) return walk(path)
      return /\.tsx?$/.test(entry) ? [path] : []
    })
  }

  const componentFiles = walk(resolve(process.cwd(), 'src'))
    .filter((path) => !/\.test\.tsx?$|\/test\/|\/__tests__\//.test(path))
    .map((path) => path.replace(`${process.cwd()}/`, ''))

  it('finds source files to scan', () => {
    expect(componentFiles.length).toBeGreaterThan(0)
  })

  it.each(componentFiles)('has no raw hex colour in %s', (path) => {
    const offenders = readFile(path).match(
      /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g
    )
    expect(offenders).toBeNull()
  })
})
