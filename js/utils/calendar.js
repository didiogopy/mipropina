/**
 * Converts an income record to its local calendar date without shifting date-only ISO values.
 * @param {Object} income - Record containing a Firestore timestamp or fecha_str value
 * @returns {Date}
 */
export function toCalendarDate(income) {
    if (income?.fecha?.toDate instanceof Function) {
        return income.fecha.toDate();
    }

    const value = income?.fecha_str || income?.fecha;
    const dateOnly = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;

    if (dateOnly) {
        return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12);
    }

    return new Date(value);
}
