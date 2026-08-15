import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { clearApiCache } from '@/lib/apiCache'
import { resetViewport } from '@/test/viewport'

beforeEach(resetViewport)
beforeEach(clearApiCache)
