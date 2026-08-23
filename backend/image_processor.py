import cv2
import numpy as np
from PIL import Image
import pytesseract
import re
import os

# Configure Tesseract path for Windows (if needed)
# Uncomment and set the path if Tesseract is not in your PATH
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def preprocess_image(image_path):
    """Preprocess image for better OCR and line detection"""
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Could not read image")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply threshold to get binary image
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Denoise
    denoised = cv2.fastNlMeansDenoising(thresh, None, 10, 7, 21)
    
    return denoised, img

def detect_table_structure(image):
    """Detect horizontal and vertical lines to identify table structure"""
    # Detect horizontal lines
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    horizontal_lines = cv2.morphologyEx(image, cv2.MORPH_OPEN, horizontal_kernel)
    horizontal_lines = cv2.dilate(horizontal_lines, horizontal_kernel, iterations=2)
    
    # Detect vertical lines
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    vertical_lines = cv2.morphologyEx(image, cv2.MORPH_OPEN, vertical_kernel)
    vertical_lines = cv2.dilate(vertical_lines, vertical_kernel, iterations=2)
    
    # Combine lines
    table_mask = cv2.addWeighted(horizontal_lines, 0.5, vertical_lines, 0.5, 0.0)
    
    return table_mask, horizontal_lines, vertical_lines

def extract_table_cells(image, horizontal_lines, vertical_lines):
    """Extract individual cells from the table"""
    # Find contours for horizontal and vertical lines
    h_contours, _ = cv2.findContours(horizontal_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    v_contours, _ = cv2.findContours(vertical_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Get horizontal and vertical line positions
    h_lines = sorted([int(np.mean(c[:, 0, 1])) for c in h_contours if cv2.contourArea(c) > 100])
    v_lines = sorted([int(np.mean(c[:, 0, 0])) for c in v_contours if cv2.contourArea(c) > 100])
    
    # Remove duplicates (lines that are too close)
    h_lines = [h_lines[0]] + [h_lines[i] for i in range(1, len(h_lines)) if h_lines[i] - h_lines[i-1] > 10]
    v_lines = [v_lines[0]] + [v_lines[i] for i in range(1, len(v_lines)) if v_lines[i] - v_lines[i-1] > 10]
    
    cells = []
    
    # Extract cells
    for i in range(len(h_lines) - 1):
        row = []
        for j in range(len(v_lines) - 1):
            x1, y1 = v_lines[j], h_lines[i]
            x2, y2 = v_lines[j + 1], h_lines[i + 1]
            
            # Extract cell region
            cell = image[y1:y2, x1:x2]
            row.append({
                'image': cell,
                'x': x1,
                'y': y1,
                'width': x2 - x1,
                'height': y2 - y1
            })
        if row:
            cells.append(row)
    
    return cells

def count_vertical_lines(cell_image):
    """Count vertical lines in a cell (representing goals or assists)"""
    # Convert to grayscale if needed
    if len(cell_image.shape) == 3:
        gray = cv2.cvtColor(cell_image, cv2.COLOR_BGR2GRAY)
    else:
        gray = cell_image.copy()
    
    # Apply threshold
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Detect vertical lines using HoughLines
    lines = cv2.HoughLinesP(thresh, 1, np.pi/180, threshold=20, minLineLength=10, maxLineGap=5)
    
    if lines is None:
        return 0
    
    # Filter for vertical lines (angle close to 90 degrees)
    vertical_count = 0
    for line in lines:
        x1, y1, x2, y2 = line[0]
        # Check if line is roughly vertical
        if abs(x2 - x1) < 5 and abs(y2 - y1) > 5:
            vertical_count += 1
    
    # Alternative: Use contour detection for vertical lines
    if vertical_count == 0:
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours that are vertical lines
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            # Vertical line: width is small, height is significant
            if w < 10 and h > 15:
                vertical_count += 1
    
    return vertical_count

def extract_text_from_cell(cell_image):
    """Extract text from a cell using OCR"""
    # Convert to PIL Image
    if len(cell_image.shape) == 3:
        pil_image = Image.fromarray(cv2.cvtColor(cell_image, cv2.COLOR_BGR2RGB))
    else:
        pil_image = Image.fromarray(cell_image)
    
    # Use OCR
    try:
        text = pytesseract.image_to_string(pil_image, config='--psm 7')
        # Clean up text
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    except:
        return ""

def process_match_image(image_path):
    """
    Process a match statistics image and extract player data
    
    Returns a list of dictionaries with:
    - name: player name (may be empty if OCR fails)
    - goals: number of goals (counted from vertical lines)
    - assists: number of assists (counted from vertical lines)
    """
    try:
        # Preprocess image
        processed_img, original_img = preprocess_image(image_path)
        
        # Detect table structure
        table_mask, horizontal_lines, vertical_lines = detect_table_structure(processed_img)
        
        # Extract table cells
        cells = extract_table_cells(processed_img, horizontal_lines, vertical_lines)
        
        if not cells or len(cells) < 2:
            raise ValueError("Could not detect table structure in image")
        
        # First row is header, skip it
        data_rows = cells[1:]
        
        extracted_data = []
        
        for row in data_rows:
            if len(row) < 3:
                continue
            
            # Column 1: Player name
            name_cell = row[0]
            player_name = extract_text_from_cell(name_cell['image'])
            
            # Column 2: Goals (vertical lines)
            goals_cell = row[1]
            goals = count_vertical_lines(goals_cell['image'])
            
            # Column 3: Assists (vertical lines)
            assists_cell = row[2]
            assists = count_vertical_lines(assists_cell['image'])
            
            extracted_data.append({
                'name': player_name,
                'goals': goals,
                'assists': assists
            })
        
        return extracted_data
    
    except Exception as e:
        raise Exception(f"Error processing image: {str(e)}")
