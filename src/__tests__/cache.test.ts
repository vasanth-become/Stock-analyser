import { cacheGet, cacheSet, cacheGetOrSet, cacheInvalidate } from '@/lib/cache'

describe('In-memory cache', () => {
  beforeEach(async () => {
    // Clear all keys that test might have set
    cacheInvalidate('test:')
    cacheInvalidate('getOrSet:')
    cacheInvalidate('inv:')
  })

  describe('cacheSet / cacheGet', () => {
    it('stores and retrieves a string value', async () => {
      await cacheSet('test:str', 'hello', 60)
      const v = await cacheGet<string>('test:str')
      expect(v).toBe('hello')
    })

    it('stores and retrieves an object', async () => {
      const obj = { x: 1, y: 'two', z: [3] }
      await cacheSet('test:obj', obj, 60)
      const v = await cacheGet<typeof obj>('test:obj')
      expect(v).toEqual(obj)
    })

    it('returns null for a missing key', async () => {
      const v = await cacheGet('test:nonexistent-key-xyz')
      expect(v).toBeNull()
    })

    it('overwrites an existing entry', async () => {
      await cacheSet('test:overwrite', 'first', 60)
      await cacheSet('test:overwrite', 'second', 60)
      expect(await cacheGet<string>('test:overwrite')).toBe('second')
    })

    it('returns null after TTL expires (simulated via jest fake timers)', async () => {
      jest.useFakeTimers()
      await cacheSet('test:ttl', 'expiring', 1) // 1-second TTL
      jest.advanceTimersByTime(1001)             // advance past TTL
      const v = await cacheGet<string>('test:ttl')
      expect(v).toBeNull()
      jest.useRealTimers()
    })

    it('returns value before TTL expires', async () => {
      jest.useFakeTimers()
      await cacheSet('test:alive', 'still here', 10)
      jest.advanceTimersByTime(5000) // only half the TTL
      const v = await cacheGet<string>('test:alive')
      expect(v).toBe('still here')
      jest.useRealTimers()
    })
  })

  describe('cacheGetOrSet', () => {
    it('calls fetcher on cache miss and caches result', async () => {
      const fetcher = jest.fn().mockResolvedValue(42)
      const v1 = await cacheGetOrSet('getOrSet:num', fetcher, 60)
      expect(v1).toBe(42)
      expect(fetcher).toHaveBeenCalledTimes(1)
    })

    it('returns cached value without calling fetcher on second call', async () => {
      const fetcher = jest.fn().mockResolvedValue('cached')
      await cacheGetOrSet('getOrSet:hit', fetcher, 60)
      await cacheGetOrSet('getOrSet:hit', fetcher, 60)
      expect(fetcher).toHaveBeenCalledTimes(1)
    })

    it('calls fetcher again after TTL expires', async () => {
      jest.useFakeTimers()
      const fetcher = jest.fn().mockResolvedValue('fresh')
      await cacheGetOrSet('getOrSet:expired', fetcher, 1)
      jest.advanceTimersByTime(1001)
      await cacheGetOrSet('getOrSet:expired', fetcher, 1)
      expect(fetcher).toHaveBeenCalledTimes(2)
      jest.useRealTimers()
    })

    it('propagates fetcher errors', async () => {
      const fetcher = jest.fn().mockRejectedValue(new Error('fetch fail'))
      await expect(cacheGetOrSet('getOrSet:err', fetcher, 60)).rejects.toThrow('fetch fail')
    })
  })

  describe('cacheInvalidate', () => {
    it('removes all keys with the given prefix', async () => {
      await cacheSet('inv:a', 1, 60)
      await cacheSet('inv:b', 2, 60)
      await cacheSet('inv:c', 3, 60)
      await cacheSet('other:keep', 99, 60)

      cacheInvalidate('inv:')

      expect(await cacheGet('inv:a')).toBeNull()
      expect(await cacheGet('inv:b')).toBeNull()
      expect(await cacheGet('inv:c')).toBeNull()
      expect(await cacheGet<number>('other:keep')).toBe(99)
    })

    it('is a no-op for a prefix with no matching keys', () => {
      expect(() => cacheInvalidate('no-match-xyz:')).not.toThrow()
    })
  })
})
