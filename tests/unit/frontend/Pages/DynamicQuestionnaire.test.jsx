import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DynamicQuestionnaire from "../../../../src/components/forms/DynamicQuestionnaire.jsx";
const mockOnChange = jest.fn();

const sampleQuestions = [
  { id: "q1", label: "First Name", type: "short_text", required: true },
  { id: "q2", label: "BIO", type: "long_text" },
  { id: "q3", label: "Birth Date", type: "date" },
  {
    id: "q4",
    label: "Favorite Color",
    type: "select",
    options: ["Red", "Blue", "Green"],
  },
  {
    id: "q5",
    label: "Gender",
    type: "radio",
    options: ["Male", "Female"],
  },
  {
    id: "q6",
    label: "Hobbies",
    type: "checkbox",
    options: ["Sports", "Music"],
  },
  {
    id: "q7",
    label: "Unknown Field",
    type: "weird_type",
  },
];

describe("DynamicQuestionnaire", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. renders nothing when no questions provided", () => {
    const { container } = render(
      <DynamicQuestionnaire questions={[]} onChange={mockOnChange} />,
    );

    expect(container.firstChild).toBeNull();
  });

  test("2. renders all question labels", () => {
    render(
      <DynamicQuestionnaire
        questions={sampleQuestions}
        answers={{}}
        onChange={mockOnChange}
      />,
    );

    sampleQuestions.forEach((q) => {
      expect(screen.getByText(new RegExp(q.label, "i"))).toBeInTheDocument();
    });
  });

  test("3. updates short text input on change", () => {
    render(
      <DynamicQuestionnaire
        questions={sampleQuestions}
        answers={{}}
        onChange={mockOnChange}
      />,
    );

    const label = screen.getByText("FIRST NAME *");
    const input = label.closest("div").querySelector("input");

    fireEvent.change(input, { target: { value: "Test" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      q1: "Test",
    });
  });

  test("4. updates textarea input", () => {
    render(
      <DynamicQuestionnaire
        questions={sampleQuestions}
        answers={{}}
        onChange={mockOnChange}
      />,
    );

    const label = screen.getByText("BIO");
    const textarea = label.closest("div").querySelector("textarea");

    fireEvent.change(textarea, { target: { value: "Hello world" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      q2: "Hello world",
    });
  });

  test("5. updates select dropdown", () => {
    render(
      <DynamicQuestionnaire
        questions={sampleQuestions}
        answers={{}}
        onChange={mockOnChange}
      />,
    );

    const label = screen.getByText("FAVORITE COLOR");
    const select = label.closest("div").querySelector("select");

    fireEvent.change(select, { target: { value: "Blue" } });

    expect(mockOnChange).toHaveBeenCalledWith({
      q4: "Blue",
    });
  });

  test("6. updates radio selection", () => {
    render(
      <DynamicQuestionnaire
        questions={sampleQuestions}
        answers={{}}
        onChange={mockOnChange}
      />,
    );

    const radio = screen.getByLabelText("Male");
    fireEvent.click(radio);

    expect(mockOnChange).toHaveBeenCalledWith({
      q5: "Male",
    });
  });

  test("7. handles checkbox selection (add)", () => {
    render(
      <DynamicQuestionnaire
        questions={sampleQuestions}
        answers={{}}
        onChange={mockOnChange}
      />,
    );

    const checkbox = screen.getByLabelText("Sports");
    fireEvent.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith({
      q6: ["Sports"],
    });
  });

  test("8. handles checkbox deselection (remove)", () => {
    render(
      <DynamicQuestionnaire
        questions={sampleQuestions}
        answers={{ q6: ["Sports"] }}
        onChange={mockOnChange}
      />,
    );

    const checkbox = screen.getByLabelText("Sports");
    fireEvent.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith({
      q6: [],
    });
  });

  test("9. falls back to text input for unknown type", () => {
    render(
      <DynamicQuestionnaire
        questions={sampleQuestions}
        answers={{}}
        onChange={mockOnChange}
      />,
    );

    const label = screen.getByText("UNKNOWN FIELD");
    const input = label.closest("div").querySelector("input");

    expect(input).toBeInTheDocument();
  });

  test("10. respects readOnly mode", () => {
    render(
      <DynamicQuestionnaire
        questions={sampleQuestions}
        answers={{ q1: "Existing" }}
        onChange={mockOnChange}
        readOnly={true}
      />,
    );

    const label = screen.getByText("FIRST NAME *");
    const input = label.closest("div").querySelector("input");

    expect(input).toBeDisabled();
  });

  test("11. updates date input", () => {
    render(
      <DynamicQuestionnaire
        questions={sampleQuestions}
        answers={{}}
        onChange={mockOnChange}
      />,
    );

    const label = screen.getByText(/birth date/i);
    const dateInput = label.closest("div").querySelector('input[type="date"]');

    fireEvent.change(dateInput, {
      target: { value: "2026-04-27" },
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      q3: "2026-04-27",
    });
  });

  test("12. disables checkbox and radio in readOnly mode", () => {
    render(
      <DynamicQuestionnaire
        questions={sampleQuestions}
        answers={{}}
        onChange={mockOnChange}
        readOnly={true}
      />,
    );

    expect(screen.getByLabelText(/Male/)).toBeDisabled();
    expect(screen.getByLabelText(/Sports/)).toBeDisabled();
  });

  test("13. updates unknown fallback input", () => {
    render(
      <DynamicQuestionnaire
        questions={sampleQuestions}
        answers={{}}
        onChange={mockOnChange}
      />,
    );

    const label = screen.getByText(/unknown field/i);
    const input = label.closest("div").querySelector("input");

    fireEvent.change(input, {
      target: { value: "test value" },
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      q7: "test value",
    });
  });
});
