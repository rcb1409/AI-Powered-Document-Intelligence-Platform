/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react';
import ErrorBanner from '../ErrorBanner';


describe('ErrorBanner', () => {
    it('should render error message', () => {
      render(<ErrorBanner message="Something went wrong" />);
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  
    it('should apply custom className', () => {
      const { container } = render(
        <ErrorBanner message="Error" className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });