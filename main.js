/**
 * REGLAS DE COMBATE Y LÓGICA DE JUEGO
 * Este archivo gestiona la clase Player y el flujo de batalla (Game Manager).
 * Implementa mecánicas de daño con varianza, críticos, contraataques y robo de vida.
 */

class Player {
    constructor(name, isMachine = false) {
        this.name = name;
        this.health = 100;
        this.baseAttack = 20;
        this.healPoints = 10;
        this.isMachine = isMachine;
        this.canAttack = true;
        this.canHeal = true;
        this.isDefending = false;

        /**
         * Lógica de Ataque:
         * Calcula daño base (20) con varianza de ±2 y 15% de probabilidad de crítico (x1.5).
         * Si el oponente defiende, el daño se reduce al 40% y existe un 30% de probabilidad
         * de recibir un contraataque de 10 HP.
         */
        this.attack = (opponent) => {
            if (!this.canAttack) return;

            const variance = Math.floor(Math.random() * 5) - 2;
            let damage = this.baseAttack + variance;
            const isCrit = Math.random() < 0.15;

            if (isCrit) {
                damage = Math.floor(damage * 1.5);
                writeLog(`💥 ¡GOLPE CRÍTICO de ${this.name}!`, 'log-attack');
            }

            if (opponent.isDefending) {
                damage = Math.ceil(damage * 0.4);
                writeLog(`🛡️ ${opponent.name} absorbió gran parte del impacto.`, 'log-defend');

                if (Math.random() < 0.3) {
                    const counterDamage = 10;
                    this.health -= counterDamage;
                    if (this.health < 0) this.health = 0;
                    writeLog(`⚡ ¡CONTRAATAQUE! ${opponent.name} devuelve ${counterDamage} de daño.`, 'log-attack');
                }
            }

            opponent.health -= damage;
            if (opponent.health < 0) opponent.health = 0;
            return { damage, isCrit };
        };

        /**
         * Lógica de Defensa:
         * El jugador entra en guardia, reduciendo el daño recibido, pero pierde
         * la capacidad de atacar hasta su próximo turno.
         */
        this.defend = () => {
            this.isDefending = true;
            this.canAttack = false;
        };

        this.resetState = () => {
            this.isDefending = false;
            this.canAttack = true;
        };
    }

    /**
     * Lógica de Curación (Robo de Vida):
     * Recupera entre 8-12 HP y drena esa misma cantidad exacta al oponente.
     * Implementa un cooldown de 5 segundos para balancear la partida.
     */
    heal(opponent) {
        if (!this.canHeal) return;

        const variance = Math.floor(Math.random() * 5) - 2;
        const healAmount = this.healPoints + variance;
        const previousHealth = this.health;

        this.health += healAmount;
        if (this.health > 100) this.health = 100;

        if (previousHealth < 100) {
            writeLog(`🩸 ${this.name} absorbió ${healAmount} de vida de ${opponent.name}.`, 'log-heal');
            opponent.health -= healAmount;
            if (opponent.health < 0) opponent.health = 0;

            const opponentIndex = 1 - players.indexOf(this);
            const opponentCard = document.getElementById(`card-${opponentIndex}`);
            opponentCard.classList.add('shake');
            setTimeout(() => opponentCard.classList.remove('shake'), 400);
        }

        const myIndex = players.indexOf(this);
        document.getElementById(`card-${myIndex}`).classList.add('heal-effect');
        setTimeout(() => document.getElementById(`card-${myIndex}`).classList.remove('heal-effect'), 1000);

        this.canHeal = false;
        setTimeout(() => {
            this.canHeal = true;
            if (this.health > 0) writeLog(`✨ ${this.name} puede volver a curarse.`);
        }, 5000);
    }
}

/**
 * GESTIÓN GLOBAL DEL ESTADO
 */
let players = [];
let currentTurn = 0;
let gameIsOver = false;

const writeLog = (message, type = '') => {
    const logContainer = document.getElementById('log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerText = `> ${message}`;
    logContainer.prepend(entry);
};

/**
 * Inicialización de la partida y configuración de personajes.
 */
document.getElementById('start-btn').addEventListener('click', () => {
    const name1 = document.getElementById('p1-name').value || "Jugador 1";
    const name2 = document.getElementById('p2-name').value || "Jugador 2";
    const vsMachine = document.getElementById('vs-machine').checked;

    players = [
        new Player(name1),
        new Player(vsMachine ? "CPU (Máquina)" : name2, vsMachine)
    ];

    document.getElementById('name-0').innerText = players[0].name;
    document.getElementById('name-1').innerText = players[1].name;
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';

    updateUI();
    writeLog(`¡La batalla comienza! Turno de ${players[currentTurn].name}`);
});

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Núcleo de Interacción:
 * Orquesta las animaciones de ataque, daño visual y flujo de turnos.
 */
const interact = async (action, playerIndex) => {
    if (gameIsOver || playerIndex !== currentTurn) return;

    const attacker = players[playerIndex];
    const opponent = players[1 - playerIndex];
    const attackerCard = document.getElementById(`card-${playerIndex}`);
    const opponentCard = document.getElementById(`card-${1 - playerIndex}`);
    const attackerSprite = attackerCard.querySelector('.character-sprite');
    const opponentSprite = opponentCard.querySelector('.character-sprite');

    document.querySelectorAll('.controls button').forEach(btn => btn.disabled = true);

    switch (action) {
        case 'atacar':
            attackerSprite.classList.add(`attack-${playerIndex}`);
            writeLog(`${attacker.name} se prepara para atacar...`);
            await wait(300);

            attacker.attack(opponent);
            writeLog(`${attacker.name} impactó a ${opponent.name}!`, 'log-attack');

            opponentSprite.classList.add('damage-flash');
            opponentCard.classList.add('shake');
            await wait(300);

            opponentSprite.classList.remove('damage-flash');
            opponentCard.classList.remove('shake');
            attackerSprite.classList.remove(`attack-${playerIndex}`);
            break;

        case 'curar':
            if (!attacker.canHeal) {
                writeLog(`¡${attacker.name} todavía no puede curarse!`);
                break;
            }
            attacker.heal(opponent);
            writeLog(`${attacker.name} usó curación espiritual`, 'log-heal');
            await wait(600);
            break;

        case 'defender':
            attacker.defend();
            writeLog(`${attacker.name} entró en modo guardia`, 'log-defend');
            await wait(400);
            break;
    }

    updateUI();
    checkWinner();
    if (!gameIsOver) passTurn();
};

const passTurn = () => {
    currentTurn = 1 - currentTurn;
    players[currentTurn].resetState();
    updateUI();
    writeLog(`Turno de: ${players[currentTurn].name}`);
    if (players[currentTurn].isMachine) {
        setTimeout(machineLogic, 1200);
    }
};

/**
 * Inteligencia Artificial:
 * Prioriza curación al estar bajo de salud y gestiona ataques tácticos
 * basándose en si el oponente está en posición de defensa.
 */
const machineLogic = () => {
    if (gameIsOver) return;

    const cpu = players[1];
    const user = players[0];

    if (cpu.health < 35 && cpu.canHeal) {
        interact('curar', 1);
        return;
    }

    if (user.isDefending) {
        if (cpu.canHeal && cpu.health < 80) {
            interact('curar', 1);
        } else {
            if (Math.random() < 0.4) interact('atacar', 1);
            else interact('defender', 1);
        }
    } else {
        if (Math.random() < 0.15) interact('defender', 1);
        else interact('atacar', 1);
    }
};

/**
 * Interfaz de Usuario:
 * Sincroniza las barras de vida, estados de escudo y disponibilidad de botones.
 */
const updateUI = () => {
    players.forEach((p, i) => {
        const hpFill = document.getElementById(`hp-fill-${i}`);
        const hpText = document.getElementById(`hp-text-${i}`);
        hpFill.style.width = `${p.health}%`;
        hpText.innerText = p.health;

        hpFill.classList.remove('warning', 'critical');
        if (p.health < 20) hpFill.classList.add('critical');
        else if (p.health < 50) hpFill.classList.add('warning');

        document.getElementById(`card-${i}`).classList.toggle('active', i === currentTurn);

        const charBox = document.getElementById(`char-box-${i}`);
        p.isDefending ? charBox.classList.add('guarding') : charBox.classList.remove('guarding');

        const actionButtons = document.querySelectorAll(`#controls-${i} button`);
        actionButtons.forEach(btn => {
            const isUserControlling = (i === currentTurn && !p.isMachine && !gameIsOver);
            const buttonText = btn.innerText.toLowerCase();

            if (buttonText.includes('atacar')) {
                btn.disabled = !isUserControlling || !p.canAttack;
            } else if (buttonText.includes('curar')) {
                btn.disabled = !isUserControlling || !p.canHeal;
                btn.style.opacity = p.canHeal ? "1" : "0.5";
            } else {
                btn.disabled = !isUserControlling;
            }
        });
    });
};

/**
 * Control de Fin de Partida:
 * Gestiona las animaciones de derrota y muestra el modal de victoria.
 */
const checkWinner = () => {
    const defeatedPlayer = players.find(p => p.health <= 0);

    if (defeatedPlayer) {
        gameIsOver = true;
        const defeatedIndex = players.indexOf(defeatedPlayer);
        const defeatedSprite = document.getElementById(`card-${defeatedIndex}`).querySelector('.character-sprite');
        defeatedSprite.classList.add('death-fade');

        const winner = players.find(p => p.health > 0);
        writeLog(`🏆 ¡BATALLA TERMINADA! El ganador es ${winner.name}`, 'log-heal');

        setTimeout(() => {
            const modal = document.getElementById('victory-modal');
            const title = document.getElementById('victory-title');
            const msg = document.getElementById('victory-msg');
            title.innerText = `¡VICTORIA!`;
            msg.innerText = `${winner.name} ha conquistado la arena con honor y estrategia.`;
            modal.style.display = 'flex';
        }, 1200);
    }
};
