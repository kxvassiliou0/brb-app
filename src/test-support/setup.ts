import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'
import { clearApiCache } from '@/api/cache'
import { resetViewport } from '@/test-support/viewport'

beforeEach(resetViewport)
beforeEach(clearApiCache)
