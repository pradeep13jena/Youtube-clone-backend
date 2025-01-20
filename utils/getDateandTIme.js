export default function getFormattedDateTime() {
  const date = new Date();

  // Format the time
  const hours = String(date.getHours()).padStart(2, "0"); // Ensures two digits for hours
  const minutes = String(date.getMinutes()).padStart(2, "0"); // Ensures two digits for minutes

  // Format the date
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const year = String(date.getFullYear()).slice(-2); // Get the last two digits of the year

  return `${hours}:${minutes} ${day}-${month}-${year}`;
}
