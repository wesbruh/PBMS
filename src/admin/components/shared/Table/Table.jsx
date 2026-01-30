import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import "./Table.css";

const Table = ({
  columns,
  data,
  onRowClick,
  searchable = false,
  searchPlaceholder = "Search clients...",
  rowsPerPage = 8, // Default number of rows per table page for pagination can benmodified in the dedicated page's jsx file.
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [searchTerm, setSearchTerm] = useState(""); // Search state
  const [currentPage, setCurrentPage] = useState(1); // Pagination state

  // Handle sorting when a column header is clicked
  const handleSort = (columnKey) => {
    let direction = "asc";

    // If clicking the same column, toggle direction
    if (sortConfig.key === columnKey && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key: columnKey, direction });
    setCurrentPage(1); // Reset to first page on sort
  };

  // Filter data based on the search term in search functionality
  const filteredData = data.filter((row) => {
    if (!searchTerm) return true; // If no search term, include all rows

    // Search through all columns for the term
    return columns.some((column) => {
      const cellValue = row[column.key];
      if (cellValue === null || cellValue === undefined) return false;

      // Convert to string and check if it includes the search term (case insensitive)
      return cellValue
        .toString()
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    });
  });

  // Sort the data based on current sort config
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  /* PAGINATION LOGIC */
  // Calculate pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);
  const emptyRows = rowsPerPage - paginatedData.length; // Number of empty rows needed to maintain table height

  // Handle page change
  const goToPage = (pageNumber) => {
    setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages)));
  };
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  return (
    <div className="table-wrapper">
      {/* Search bar functionality (Will only show if the searchable prop is set to true) */}
      {searchable && (
        <div className="table-search">
          <Search className="table-search-icon" size={20} />
          <input
            type="text"
            className="table-search-input"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      )}
      <div className="table-container">
        <table className="table">
          {/* Table Header */}
          <thead className="table__head">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`table__header ${column.sortable ? "table__header--sortable" : ""}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="table__header-content">
                    <span>{column.label}</span>

                    {/* Show sort indicator if this column is sorted */}
                    {column.sortable && sortConfig.key === column.key && (
                      <span className="table__sort-icon">
                        {sortConfig.direction === "asc" ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body - only shows current paginated data */}
          <tbody className="table__body">
            {paginatedData.map((row, rowIndex) => (
              <tr
                // Clickable row, can be modified maybe to show more information of client/session
                key={row.id || rowIndex}
                className={`table__row ${onRowClick ? "table__row--clickable" : ""}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="table__cell">
                    {/* If column has custom render function, use it. Otherwise show raw value */}
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
            {/* Filler rows to keep table height consistent */}
            {emptyRows > 0 &&
              Array.from({ length: emptyRows }).map((_, index) => (
                <tr
                  key={`empty-${index}`}
                  className="table__row table__row--empty"
                >
                  {columns.map((column) => (
                    <td key={column.key} className="table__cell">
                      &nbsp;
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>

        {/* Show message if no data */}
        {sortedData.length === 0 && (
          <div className="table__empty">
            <p>
              {searchTerm
                ? `No results found for "${searchTerm}".`
                : "No data available."}
            </p>
          </div>
        )}
      </div>
      
      {/* Pagination Controls */}
      {sortedData.length > 0 && totalPages > 1 && (
        <div className="table-pagination">
          <div className="table-pagination__info">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)}{" "}
            of {sortedData.length} results
          </div>
          {/* Previous Page */}
          <div className="table-pagination__controls">
            <button
              className="table-pagination__button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            {/* Current Page Indicator */}
            <div className="table-pagination-current">
              Page {currentPage} of {totalPages}
            </div>
            {/* Next Page */}
            <button
              className="table-pagination__button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
