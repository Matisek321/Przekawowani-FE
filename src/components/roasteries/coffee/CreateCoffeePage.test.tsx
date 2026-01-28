import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { CreateCoffeePage } from './CreateCoffeePage'
import { useDisplayNameGate } from '@/components/auth/useDisplayNameGate'
import type { RoasteryDto } from '@/types'

// Mock useDisplayNameGate hook
vi.mock('@/components/auth/useDisplayNameGate')

// Mock CreateCoffeeForm to isolate page tests
vi.mock('@/components/roasteries/coffee/CreateCoffeeForm', () => ({
  CreateCoffeeForm: vi.fn(({ roasteryId, onSuccess }) => (
    <div data-testid="create-coffee-form" data-roastery-id={roasteryId}>
      Mocked Form
      <button onClick={() => onSuccess({ id: 'coffee-123', name: 'Test Coffee' })}>
        Trigger Success
      </button>
    </div>
  )),
}))

// Mock window.location.assign
const mockLocationAssign = vi.fn()
Object.defineProperty(window, 'location', {
  value: { assign: mockLocationAssign },
  writable: true,
})

// Helper to mock useDisplayNameGate return value
function mockGateHook(overrides: Partial<ReturnType<typeof useDisplayNameGate>> = {}) {
  const defaultGate = {
    accessToken: 'mock-token',
    isAllowed: true,
    isChecking: false,
    isRedirecting: false,
    isBlocked: false,
    gate: { status: 'allowed' as const },
    profile: null,
    userId: 'user-123',
    isAuthenticated: true,
  }
  ;(useDisplayNameGate as Mock).mockReturnValue({ ...defaultGate, ...overrides })
}

// Factory for mock roastery data
function createMockRoastery(overrides: Partial<RoasteryDto> = {}): RoasteryDto {
  return {
    id: 'roastery-1',
    name: 'Coffee Lab',
    city: 'Warszawa',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('CreateCoffeePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGateHook()
    // Default fetch mock to prevent unhandled fetch errors
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(createMockRoastery()),
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner when gate is checking', () => {
      mockGateHook({ isChecking: true, isAllowed: false })

      render(<CreateCoffeePage roasteryId="roastery-1" />)

      expect(screen.getByText('Sprawdzanie dostępu...')).toBeInTheDocument()
      expect(screen.queryByTestId('create-coffee-form')).not.toBeInTheDocument()
    })

    it('shows redirecting message when gate is redirecting', () => {
      mockGateHook({ isRedirecting: true, isAllowed: false })

      render(<CreateCoffeePage roasteryId="roastery-1" />)

      expect(screen.getByText('Przekierowuję...')).toBeInTheDocument()
    })

    it('shows loading state while fetching roastery data', async () => {
      // Mock fetch to never resolve during this test
      global.fetch = vi.fn(() => new Promise(() => {}))

      render(<CreateCoffeePage roasteryId="roastery-1" />)

      await waitFor(() => {
        expect(screen.getByText('Ładowanie danych palarni...')).toBeInTheDocument()
      })
    })
  })

  describe('Error States', () => {
    it('shows error message when gate is blocked due to error', () => {
      mockGateHook({
        isBlocked: true,
        isAllowed: false,
        gate: { status: 'blocked', reason: 'error' },
      })

      render(<CreateCoffeePage roasteryId="roastery-1" />)

      expect(
        screen.getByText('Wystąpił błąd podczas sprawdzania dostępu. Odśwież stronę i spróbuj ponownie.')
      ).toBeInTheDocument()
    })

    it('shows access denied message when gate is blocked without error reason', () => {
      mockGateHook({
        isBlocked: true,
        isAllowed: false,
        gate: { status: 'blocked' },
      })

      render(<CreateCoffeePage roasteryId="roastery-1" />)

      expect(screen.getByText('Nie masz dostępu do tej strony.')).toBeInTheDocument()
    })

    it('shows link to roastery when blocked and roasteryId is provided', () => {
      mockGateHook({
        isBlocked: true,
        isAllowed: false,
        gate: { status: 'blocked', reason: 'error' },
      })

      render(<CreateCoffeePage roasteryId="roastery-1" />)

      const link = screen.getByRole('link', { name: /wróć do palarni/i })
      expect(link).toHaveAttribute('href', '/roasteries/roastery-1')
    })

    it('shows error when roastery is not found (404)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })

      render(<CreateCoffeePage roasteryId="nonexistent" />)

      await waitFor(() => {
        expect(screen.getByText('Palarnia nie została znaleziona')).toBeInTheDocument()
      })
    })

    it('shows generic error when roastery fetch fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      render(<CreateCoffeePage roasteryId="roastery-1" />)

      await waitFor(() => {
        expect(
          screen.getByText('Wystąpił błąd podczas pobierania danych palarni')
        ).toBeInTheDocument()
      })
    })

    it('shows connection error when fetch throws', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      render(<CreateCoffeePage roasteryId="roastery-1" />)

      await waitFor(() => {
        expect(
          screen.getByText('Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.')
        ).toBeInTheDocument()
      })
    })
  })

  describe('Success State - Form Rendering', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createMockRoastery()),
      })
    })

    it('renders page title and description', async () => {
      render(<CreateCoffeePage roasteryId="roastery-1" />)

      await waitFor(() => {
        expect(screen.getByText('Dodaj kawę')).toBeInTheDocument()
        expect(
          screen.getByText('Wprowadź nazwę nowej kawy dla wybranej palarni.')
        ).toBeInTheDocument()
      })
    })

    it('renders roastery context with name and city', async () => {
      render(<CreateCoffeePage roasteryId="roastery-1" />)

      await waitFor(() => {
        expect(screen.getByText('Palarnia:')).toBeInTheDocument()
        expect(screen.getByText('Coffee Lab')).toBeInTheDocument()
        expect(screen.getByText('(Warszawa)')).toBeInTheDocument()
      })
    })

    it('renders MVP info banner', async () => {
      render(<CreateCoffeePage roasteryId="roastery-1" />)

      await waitFor(() => {
        expect(
          screen.getByText(/W wersji MVP nie można edytować ani usuwać kawy/i)
        ).toBeInTheDocument()
      })
    })

    it('renders CreateCoffeeForm with correct props', async () => {
      render(<CreateCoffeePage roasteryId="roastery-1" />)

      await waitFor(() => {
        const form = screen.getByTestId('create-coffee-form')
        expect(form).toBeInTheDocument()
        expect(form).toHaveAttribute('data-roastery-id', 'roastery-1')
      })
    })

    it('does not render form when accessToken is missing', async () => {
      mockGateHook({ accessToken: null })

      render(<CreateCoffeePage roasteryId="roastery-1" />)

      await waitFor(() => {
        expect(screen.queryByTestId('create-coffee-form')).not.toBeInTheDocument()
      })
    })
  })

  describe('Success Callback', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createMockRoastery()),
      })
    })

    it('redirects to coffee detail page on success', async () => {
      render(<CreateCoffeePage roasteryId="roastery-1" />)

      await waitFor(() => {
        expect(screen.getByTestId('create-coffee-form')).toBeInTheDocument()
      })

      // Trigger the success callback via mocked form
      screen.getByRole('button', { name: 'Trigger Success' }).click()

      expect(mockLocationAssign).toHaveBeenCalledWith('/coffees/coffee-123')
    })
  })

  describe('Gate Configuration', () => {
    it('passes correct returnTo URL to useDisplayNameGate', () => {
      render(<CreateCoffeePage roasteryId="my-roastery-id" />)

      expect(useDisplayNameGate).toHaveBeenCalledWith({
        returnTo: '/roasteries/my-roastery-id/coffees/new',
      })
    })
  })

  describe('Roastery Fetch', () => {
    it('fetches roastery data with correct ID', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(createMockRoastery()),
      })

      render(<CreateCoffeePage roasteryId="roastery-abc" />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/roasteries/roastery-abc')
      })
    })
  })

  describe('Null State', () => {
    it('renders nothing when gate is not yet allowed', () => {
      mockGateHook({
        isAllowed: false,
        isChecking: false,
        isRedirecting: false,
        isBlocked: false,
      })

      const { container } = render(<CreateCoffeePage roasteryId="roastery-1" />)

      expect(container).toBeEmptyDOMElement()
    })
  })
})

describe('mapRoasteryDtoToContextVM', () => {
  // Note: This function is not exported, so we test it indirectly through component behavior

  beforeEach(() => {
    vi.clearAllMocks()
    mockGateHook()
  })

  it('displays only id, name, and city from roastery data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: 'r-1',
          name: 'Test Roastery',
          city: 'Kraków',
          createdAt: '2024-01-01T00:00:00Z',
        }),
    })

    render(<CreateCoffeePage roasteryId="r-1" />)

    await waitFor(() => {
      expect(screen.getByText('Test Roastery')).toBeInTheDocument()
      expect(screen.getByText('(Kraków)')).toBeInTheDocument()
    })
  })
})
