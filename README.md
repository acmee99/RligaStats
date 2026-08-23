# Football Match Stats Tracker

A web application to track hobby football matches with image-based statistics extraction. The app processes images containing match statistics tables, extracts player data (goals and assists represented as vertical lines), and stores match results with team and player statistics.

## Features

- 📸 **Image Processing**: Upload images containing match statistics tables and automatically extract player names, goals, and assists
- ⚽ **Match Management**: Create matches manually or via image upload
- 👥 **Player Management**: Maintain a pool of players
- 📊 **Statistics Dashboard**: View team wins/draws/losses and player goals/assists per season
- 🎨 **Modern UI**: Beautiful football/soccer-themed design
- 📅 **Season Tracking**: Statistics tracked per season (September to August)

## Technology Stack

- **Backend**: Python Flask, SQLAlchemy, OpenCV, PIL/Pillow, pytesseract
- **Frontend**: React, React Router, Axios, date-fns
- **Database**: SQLite

## Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- Tesseract OCR (for text extraction from images)

### Installing Tesseract OCR

**Windows:**
1. Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install and note the installation path (default: `C:\Program Files\Tesseract-OCR`)
3. Add Tesseract to your PATH or configure pytesseract in the code

**macOS:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create necessary directories:
```bash
mkdir instance
mkdir uploads
```

6. Run the Flask application:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Add Players**: Navigate to "Players" and add players to the pool
2. **Create Match**:
   - **Via Image Upload**: Go to "Upload Image", upload an image with a statistics table, extract data, map players to existing players or create new ones, assign teams, and submit
   - **Manual Entry**: Go to "New Match", select teams, add players to each team, enter goals and assists, and submit
3. **View Statistics**: Go to "Dashboard" to see team and player statistics for the current or selected season

## Image Format

The app expects images containing a table with:
- **Column 1**: Player names (text)
- **Column 2**: Goals (represented as vertical lines)
- **Column 3**: Assists (represented as vertical lines)

The first row should be a header row.

## Database Schema

- **players**: Pool of all players
- **teams**: Fixed teams (Team 1-Black, Team 2-White)
- **seasons**: Seasons (September to August)
- **matches**: Match records with dates and scores
- **match_players**: Player statistics per match (goals, assists, team)

## API Endpoints

- `GET /api/players` - Get all players
- `POST /api/players` - Create new player
- `DELETE /api/players/:id` - Delete player
- `GET /api/teams` - Get all teams
- `GET /api/seasons` - Get all seasons
- `GET /api/seasons/current` - Get current season
- `POST /api/upload` - Upload and process image
- `GET /api/matches` - Get all matches (optional: ?season_id=X)
- `POST /api/matches` - Create new match
- `DELETE /api/matches/:id` - Delete match
- `GET /api/stats/teams` - Get team statistics (optional: ?season_id=X)
- `GET /api/stats/players` - Get player statistics (optional: ?season_id=X)

## Troubleshooting

- **Image processing fails**: Ensure Tesseract OCR is installed and accessible
- **CORS errors**: Make sure the Flask backend is running and CORS is enabled
- **Database errors**: Ensure the `instance` directory exists and has write permissions

## License

This project is for personal/hobby use.
