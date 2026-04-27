import { render, screen, fireEvent } from "@testing-library/react";
import ContractDetail from "../../../src/pages/Dashboard/ContractDetail.jsx";

jest.mock("../../../src/components/contracts/SignContractModal", () => {
  return function MockSignContractModal(props) {
    return (
      <div data-testid="sign-contract-modal">
        <div>Modal Open: {String(props.open)}</div>
        <button onClick={() => props.onClose()}>Mock Close Modal</button>
        <button
          onClick={() =>
            props.onSigned({
              id: 123,
              status: "Signed",
              signed_pdf_url: "https://example.com/signed.png",
            })
          }
        >
          Mock Sign Success
        </button>
      </div>
    );
  };
});

describe("ContractDetail", () => {
  const baseContract = {
    id: 123,
    status: "Draft",
    signed_pdf_url: null,
  };

  const baseTemplate = {
    name: "Wedding Contract",
    body: "This is the contract body.",
  };

  const onSigned = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders nothing when contractTemplate is missing", () => {
    const { container } = render(
      <ContractDetail
        contract={baseContract}
        contractTemplate={null}
        onSigned={onSigned}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test("renders contract title and body", () => {
    render(
      <ContractDetail
        contract={baseContract}
        contractTemplate={baseTemplate}
        onSigned={onSigned}
      />
    );

    expect(screen.getByText("Wedding Contract")).toBeInTheDocument();
    expect(screen.getByText("This is the contract body.")).toBeInTheDocument();
  });

  test('shows "Review & Sign" button when contract is draft, unsigned, and not readOnly', () => {
    render(
      <ContractDetail
        contract={baseContract}
        contractTemplate={baseTemplate}
        onSigned={onSigned}
      />
    );

    expect(
      screen.getByRole("button", { name: /review & sign/i })
    ).toBeInTheDocument();
  });

  test('does not show "Review & Sign" button when readOnly is true', () => {
    render(
      <ContractDetail
        contract={baseContract}
        contractTemplate={baseTemplate}
        onSigned={onSigned}
        readOnly={true}
      />
    );

    expect(
      screen.queryByRole("button", { name: /review & sign/i })
    ).not.toBeInTheDocument();
  });

  test('does not show "Review & Sign" button when status is not Draft', () => {
    render(
      <ContractDetail
        contract={{ ...baseContract, status: "Signed" }}
        contractTemplate={baseTemplate}
        onSigned={onSigned}
      />
    );

    expect(
      screen.queryByRole("button", { name: /review & sign/i })
    ).not.toBeInTheDocument();
  });

  test('does not show "Review & Sign" button when signed url already exists', () => {
    render(
      <ContractDetail
        contract={{
          ...baseContract,
          signed_pdf_url: "https://example.com/signed.png",
        }}
        contractTemplate={baseTemplate}
        onSigned={onSigned}
      />
    );

    expect(
      screen.queryByRole("button", { name: /review & sign/i })
    ).not.toBeInTheDocument();
  });

  test("opens modal when Review & Sign button is clicked", () => {
    render(
      <ContractDetail
        contract={baseContract}
        contractTemplate={baseTemplate}
        onSigned={onSigned}
      />
    );

    expect(screen.getByText("Modal Open: false")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /review & sign/i }));

    expect(screen.getByText("Modal Open: true")).toBeInTheDocument();
  });

  test("closes modal when modal onClose is triggered", () => {
    render(
      <ContractDetail
        contract={baseContract}
        contractTemplate={baseTemplate}
        onSigned={onSigned}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /review & sign/i }));
    expect(screen.getByText("Modal Open: true")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mock close modal/i }));
    expect(screen.getByText("Modal Open: false")).toBeInTheDocument();
  });

  test("calls onSigned and updates status after successful signing", () => {
    render(
      <ContractDetail
        contract={baseContract}
        contractTemplate={baseTemplate}
        onSigned={onSigned}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /review & sign/i }));
    fireEvent.click(screen.getByRole("button", { name: /mock sign success/i }));

    expect(onSigned).toHaveBeenCalledWith({
      id: 123,
      status: "Signed",
      signed_pdf_url: "https://example.com/signed.png",
    });

    expect(
      screen.queryByRole("button", { name: /review & sign/i })
    ).not.toBeInTheDocument();
  });

  test("renders signature image and link when signed url exists", () => {
    render(
      <ContractDetail
        contract={{
          ...baseContract,
          status: "Signed",
          signed_pdf_url: "https://example.com/signed.png",
        }}
        contractTemplate={baseTemplate}
        onSigned={onSigned}
      />
    );

    const signatureImage = screen.getByTitle("Signature");
    expect(signatureImage).toBeInTheDocument();
    expect(signatureImage).toHaveAttribute(
      "src",
      "https://example.com/signed.png"
    );

    const signatureLink = signatureImage.closest("a");
    expect(signatureLink).toHaveAttribute(
      "href",
      "https://example.com/signed.png"
    );
  });

  test("does not render SignContractModal when readOnly is true", () => {
    render(
      <ContractDetail
        contract={baseContract}
        contractTemplate={baseTemplate}
        onSigned={onSigned}
        readOnly={true}
      />
    );

    expect(screen.queryByTestId("sign-contract-modal")).not.toBeInTheDocument();
  });
});
