const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function javaBinary(javaHome) {
  return path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
}

function javaMajor(javaCommand) {
  const result = spawnSync(javaCommand, ['-version'], { encoding: 'utf8' });
  const text = `${result.stdout || ''}\n${result.stderr || ''}`;
  const version = text.match(/version "(\d+)(?:\.|")/);
  return version ? Number(version[1]) : 0;
}

function candidateHomes() {
  const homes = [];
  if (process.env.JAVA_HOME) homes.push(process.env.JAVA_HOME);

  if (process.platform === 'win32') {
    homes.push(
      'C:\\Program Files\\Android\\Android Studio1\\jbr',
      'C:\\Program Files\\Android\\Android Studio\\jbr',
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Microsoft',
      'C:\\Program Files\\Amazon Corretto',
    );
  }

  return homes.flatMap((home) => {
    if (!home || !fs.existsSync(home)) return [];
    const directJava = javaBinary(home);
    if (fs.existsSync(directJava)) return [home];

    try {
      return fs
        .readdirSync(home, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /(?:jdk|jbr|java|temurin|corretto|openjdk).*21|21.*(?:jdk|jbr|java|temurin|corretto|openjdk)/i.test(entry.name))
        .map((entry) => path.join(home, entry.name))
        .filter((childHome) => fs.existsSync(javaBinary(childHome)));
    } catch {
      return [];
    }
  });
}

function resolveJavaHome() {
  const pathMajor = javaMajor('java');
  if (pathMajor >= 21) return null;

  return candidateHomes().find((home) => javaMajor(javaBinary(home)) >= 21) || null;
}

const env = { ...process.env };
const javaHome = resolveJavaHome();
if (javaHome) {
  env.JAVA_HOME = javaHome;
  env.Path = `${path.join(javaHome, 'bin')}${path.delimiter}${env.Path || env.PATH || ''}`;
  env.PATH = env.Path;
  console.log(`Using Java ${javaMajor(javaBinary(javaHome))} from ${javaHome}`);
}

const firebaseCli = require.resolve('firebase-tools/lib/bin/firebase.js');
const result = spawnSync(
  process.execPath,
  [firebaseCli, 'emulators:exec', '--only', 'firestore,storage', 'jest --config testing/rules/jest.config.js --runInBand'],
  { env, stdio: 'inherit' },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
