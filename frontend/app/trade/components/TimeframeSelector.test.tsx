import { render, screen, fireEvent } from '@testing-library/react';
import { TimeframeSelector } from './TimeframeSelector';

describe('TimeframeSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render all timeframe buttons', () => {
    render(<TimeframeSelector value="15m" onChange={mockOnChange} />);

    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

    timeframes.forEach((timeframe) => {
      expect(screen.getByText(timeframe)).toBeInTheDocument();
    });
  });

  it('should apply active styles to selected timeframe', () => {
    render(<TimeframeSelector value="1h" onChange={mockOnChange} />);

    const activeButton = screen.getByText('1h').closest('button');

    expect(activeButton).toHaveClass('bg-blue-600');
    expect(activeButton).toHaveClass('text-white');
  });

  it('should apply inactive styles to unselected timeframes', () => {
    render(<TimeframeSelector value="1h" onChange={mockOnChange} />);

    const inactiveButton = screen.getByText('15m').closest('button');

    expect(inactiveButton).toHaveClass('text-gray-400');
    expect(inactiveButton).toHaveClass('hover:bg-gray-700');
    expect(inactiveButton).not.toHaveClass('bg-blue-600');
  });

  it('should call onChange with correct timeframe when clicked', () => {
    render(<TimeframeSelector value="15m" onChange={mockOnChange} />);

    const button = screen.getByText('1h').closest('button');

    if (button) {
      fireEvent.click(button);
    }

    expect(mockOnChange).toHaveBeenCalledWith('1h');
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('should call onChange when clicking already active timeframe', () => {
    render(<TimeframeSelector value="1d" onChange={mockOnChange} />);

    const activeButton = screen.getByText('1d').closest('button');

    if (activeButton) {
      fireEvent.click(activeButton);
    }

    expect(mockOnChange).toHaveBeenCalledWith('1d');
  });

  it('should have correct container styling', () => {
    const { container } = render(
      <TimeframeSelector value="15m" onChange={mockOnChange} />
    );

    const containerDiv = container.firstChild;

    expect(containerDiv).toHaveClass('flex');
    expect(containerDiv).toHaveClass('gap-1');
    expect(containerDiv).toHaveClass('p-1');
    expect(containerDiv).toHaveClass('bg-gray-800');
    expect(containerDiv).toHaveClass('rounded-lg');
  });
});
