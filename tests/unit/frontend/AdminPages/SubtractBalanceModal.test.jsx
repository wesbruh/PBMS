import { fireEvent, render, screen } from "@testing-library/react";
import SubtractBalanceModal from "../../../../src/admin/pages/Payments/SubtractBalanceModal.jsx";

describe("SubtractBalanceModal", () => {
  const originalConfirm = window.confirm;

  beforeEach(() => {
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
    jest.restoreAllMocks();
  });

  test("does not render when closed", () => {
    const { container } = render(
      <SubtractBalanceModal
        isOpen={false}
        onClose={jest.fn()}
        currentBalance={50}
        onConfirm={jest.fn()}
        onRefresh={jest.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("validates amount, payment method, and submits a confirmed reduction", () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    const onRefresh = jest.fn();

    render(
      <SubtractBalanceModal
        isOpen
        onClose={onClose}
        currentBalance={100}
        onConfirm={onConfirm}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /apply reduction/i }));
    expect(
      screen.getByText(/please enter a valid amount greater than 0/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "120" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply reduction/i }));
    expect(
      screen.getByText(/cannot subtract more than the remaining balance/i)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "15" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply reduction/i }));
    expect(screen.getByText(/please enter a payment method/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/enter payment method/i), {
      target: { value: "Cash" },
    });
    expect(
      screen.getByText((content, node) => node.textContent === "New balance will be: $85.00")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /apply reduction/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("subtract $15.00")
    );
    expect(onConfirm).toHaveBeenCalledWith(15, "Cash");
    expect(onClose).toHaveBeenCalled();
    expect(onRefresh).toHaveBeenCalled();
  });

  test("allows cancelling from the confirmation prompt or cancel button", () => {
    window.confirm = jest.fn(() => false);
    const onClose = jest.fn();
    const onConfirm = jest.fn();

    render(
      <SubtractBalanceModal
        isOpen
        onClose={onClose}
        currentBalance={40}
        onConfirm={onConfirm}
        onRefresh={jest.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter payment method/i), {
      target: { value: "Zelle" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply reduction/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
