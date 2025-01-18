class ChessGame {
    constructor() {
        this.board = Array(8).fill().map(() => Array(8).fill(null))
        this.currentPlayer = 'white'
        this.selectedPiece = null
        this.gameMode = null
        this.moves = []
        this.captured = { white: [], black: [] }
        this.gameState = {
            isCheck: false,
            isCheckmate: false,
            isStalemate: false,
            inProgress: false
        }
        this.timer = { white: 600, black: 600 } // 10 minutes per player
        this.timerInterval = null
        this.moveHistory = []
        this.setupBoard()
        this.setupDOM()
        this.bindEvents()
    }

    setupBoard() {
        const backrow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
        backrow.forEach((piece, col) => {
            this.board[0][col] = { type: piece, color: 'black' }
            this.board[7][col] = { type: piece, color: 'white' }
        })
        for (let col = 0; col < 8; col++) {
            this.board[1][col] = { type: 'pawn', color: 'black' }
            this.board[6][col] = { type: 'pawn', color: 'white' }
        }
    }

    setupDOM() {
        this.boardEl = document.getElementById('chessboard')
        this.statusEl = document.getElementById('status-message')
        this.moveHistoryEl = document.getElementById('move-history')
        this.whiteTimerEl = document.getElementById('white-timer')
        this.blackTimerEl = document.getElementById('black-timer')
        this.renderBoard()
        this.updateTimers()
    }

    bindEvents() {
        document.getElementById('aiMode').onclick = () => this.startGame('ai')
        document.getElementById('multiplayerMode').onclick = () => this.startGame('multiplayer')
        document.getElementById('undoBtn').onclick = () => this.undoMove()
        document.getElementById('resetBtn').onclick = () => this.resetGame()
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                this.undoMove()
            }
        })
    }

    startGame(mode) {
        this.gameMode = mode
        this.resetGame()
        this.gameState.inProgress = true
        this.statusEl.textContent = `${this.currentPlayer}'s turn`
        if (mode === 'ai' && this.currentPlayer === 'black') {
            setTimeout(() => this.makeAIMove(), 500)
        }
        this.startTimer()
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval)
        this.timerInterval = setInterval(() => {
            if (this.gameState.inProgress) {
                this.timer[this.currentPlayer]--
                if (this.timer[this.currentPlayer] <= 0) {
                    this.handleTimeout()
                }
                this.updateTimers()
            }
        }, 1000)
    }

    updateTimers() {
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60)
            const secs = seconds % 60
            return `${mins}:${secs.toString().padStart(2, '0')}`
        }
        if (this.whiteTimerEl) {
            this.whiteTimerEl.textContent = formatTime(this.timer.white)
        }
        if (this.blackTimerEl) {
            this.blackTimerEl.textContent = formatTime(this.timer.black)
        }
    }

    handleTimeout() {
        clearInterval(this.timerInterval)
        this.gameState.inProgress = false
        const winner = this.currentPlayer === 'white' ? 'black' : 'white'
        this.statusEl.textContent = `Game Over - ${winner} wins by timeout`
    }

    renderBoard() {
        this.boardEl.innerHTML = ''
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div')
                square.className = `square ${(row + col) % 2 ? 'black' : 'white'}`
                if (this.board[row][col]) {
                    square.innerHTML = this.getPieceSymbol(this.board[row][col])
                }
                square.onclick = () => this.handleSquareClick(row, col)
                this.boardEl.appendChild(square)
            }
        }
        this.updateCaptured()
    }

    getPieceSymbol(piece) {
        const symbols = {
            white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
            black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
        }
        return symbols[piece.color][piece.type]
    }

    handleSquareClick(row, col) {
        if (!this.gameMode) return

        const piece = this.board[row][col]
        
        if (this.selectedPiece) {
            if (this.isValidMove(this.selectedPiece, row, col)) {
                this.makeMove(this.selectedPiece, row, col)
                this.selectedPiece = null
                this.renderBoard()
                
                if (this.gameMode === 'ai' && this.currentPlayer === 'black') {
                    setTimeout(() => this.makeAIMove(), 500)
                }
            } else {
                this.selectedPiece = null
            }
            this.renderBoard()
        } else if (piece && piece.color === this.currentPlayer) {
            this.selectedPiece = { row, col, piece }
            this.highlightMoves(row, col)
        }
    }

    isValidMove(selected, targetRow, targetCol) {
        const { row, col, piece } = selected
        const target = this.board[targetRow][targetCol]

        if (target && target.color === piece.color) return false

        const moves = {
            pawn: () => {
                const dir = piece.color === 'white' ? -1 : 1
                const startRow = piece.color === 'white' ? 6 : 1
                
                if (col === targetCol && !target) {
                    if (targetRow === row + dir) return true
                    if (row === startRow && targetRow === row + 2 * dir && !this.board[row + dir][col]) return true
                }
                return Math.abs(targetCol - col) === 1 && targetRow === row + dir && target
            },
            rook: () => {
                if (row !== targetRow && col !== targetCol) return false
                return this.isPathClear(row, col, targetRow, targetCol)
            },
            knight: () => {
                const dr = Math.abs(targetRow - row)
                const dc = Math.abs(targetCol - col)
                return (dr === 2 && dc === 1) || (dr === 1 && dc === 2)
            },
            bishop: () => {
                if (Math.abs(targetRow - row) !== Math.abs(targetCol - col)) return false
                return this.isPathClear(row, col, targetRow, targetCol)
            },
            queen: () => {
                if (row === targetRow || col === targetCol) {
                    return this.isPathClear(row, col, targetRow, targetCol)
                }
                if (Math.abs(targetRow - row) === Math.abs(targetCol - col)) {
                    return this.isPathClear(row, col, targetRow, targetCol)
                }
                return false
            },
            king: () => Math.abs(targetRow - row) <= 1 && Math.abs(targetCol - col) <= 1
        }

        return moves[piece.type]()
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const dr = fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow)
        const dc = fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol)
        
        let r = fromRow + dr, c = fromCol + dc
        while (r !== toRow || c !== toCol) {
            if (this.board[r][c]) return false
            r += dr
            c += dc
        }
        return true
    }

    makeMove(selected, targetRow, targetCol) {
        const target = this.board[targetRow][targetCol]
        
        if (target) {
            this.captured[this.currentPlayer].push(target)
        }
        
        this.moves.push({
            from: { row: selected.row, col: selected.col },
            to: { row: targetRow, col: targetCol },
            piece: { ...selected.piece },
            captured: target ? { ...target } : null
        })
        
        this.board[targetRow][targetCol] = selected.piece
        this.board[selected.row][selected.col] = null
        
        // Add move to history
        const files = 'abcdefgh'
        const ranks = '87654321'
        const notation = `${selected.piece.type.charAt(0).toUpperCase()}${files[selected.col]}${ranks[selected.row]} → ${files[targetCol]}${ranks[targetRow]}`
        this.moveHistory.push(notation)
        this.renderMoveHistory()
        
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white'
        this.statusEl.textContent = `${this.currentPlayer}'s turn`
    }

    renderMoveHistory() {
        if (this.moveHistoryEl) {
            this.moveHistoryEl.innerHTML = ''
            this.moveHistory.forEach((notation, i) => {
                const moveEl = document.createElement('div')
                moveEl.textContent = `${i + 1}. ${notation}`
                this.moveHistoryEl.appendChild(moveEl)
                this.moveHistoryEl.scrollTop = this.moveHistoryEl.scrollHeight
            })
        }
    }

    undoMove() {
        if (!this.moves.length) return
        
        const move = this.moves.pop()
        this.board[move.from.row][move.from.col] = move.piece
        this.board[move.to.row][move.to.col] = move.captured
        
        if (move.captured) {
            const idx = this.captured[this.currentPlayer === 'white' ? 'black' : 'white']
                .findIndex(p => p.type === move.captured.type)
            if (idx !== -1) {
                this.captured[this.currentPlayer === 'white' ? 'black' : 'white'].splice(idx, 1)
            }
        }
        
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white'
        this.statusEl.textContent = `${this.currentPlayer}'s turn`
        this.renderBoard()
    }

    resetGame() {
        this.board = Array(8).fill().map(() => Array(8).fill(null))
        this.setupBoard()
        this.currentPlayer = 'white'
        this.selectedPiece = null
        this.moves = []
        this.captured = { white: [], black: [] }
        this.statusEl.textContent = 'Select mode to begin'
        this.renderBoard()
    }

    highlightMoves(row, col) {
        const squares = Array.from(this.boardEl.children)
        squares.forEach(s => s.classList.remove('selected', 'valid-move'))
        squares[row * 8 + col].classList.add('selected')
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.isValidMove(this.selectedPiece, r, c)) {
                    squares[r * 8 + c].classList.add('valid-move')
                }
            }
        }
    }

    updateCaptured() {
        const player1El = document.querySelector('#player1 .captured-pieces')
        const player2El = document.querySelector('#player2 .captured-pieces')
        
        if (player1El && player2El) {
            player1El.textContent = this.captured.black.map(p => this.getPieceSymbol(p)).join(' ')
            player2El.textContent = this.captured.white.map(p => this.getPieceSymbol(p)).join(' ')
        }
    }

    makeAIMove() {
        const moves = []
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c]
                if (piece && piece.color === 'black') {
                    for (let tr = 0; tr < 8; tr++) {
                        for (let tc = 0; tc < 8; tc++) {
                            if (this.isValidMove({ row: r, col: c, piece }, tr, tc)) {
                                moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc } })
                            }
                        }
                    }
                }
            }
        }
        
        if (moves.length) {
            const move = moves[Math.floor(Math.random() * moves.length)]
            const piece = this.board[move.from.row][move.from.col]
            this.makeMove({ ...move.from, piece }, move.to.row, move.to.col)
            this.renderBoard()
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new ChessGame())
