export type Hero = Support | Tank | DPS;

export type HeroName = Hero["name"];

export type Ana = {
  name: "Ana";
  image: "ana.png";
};

export type Ashe = {
  name: "Ashe";
  image: "ashe.png";
};

export type Baptiste = {
  name: "Baptiste";
  image: "baptiste.png";
};

export type Bastion = {
  name: "Bastion";
  image: "bastion.png";
};

export type Brigitte = {
  name: "Brigitte";
  image: "brigitte.png";
};

export type Cassidy = {
  name: "Cassidy";
  image: "cassidy.png";
};

export type Doomfist = {
  name: "Doomfist";
  image: "doomfist.png";
};

export type Dva = {
  name: "D.Va";
  image: "dva.png";
};

export type Echo = {
  name: "Echo";
  image: "echo.png";
};

export type Genji = {
  name: "Genji";
  image: "genji.png";
};

export type Hanzo = {
  name: "Hanzo";
  image: "hanzo.png";
};

export type Illari = {
  name: "Illari";
  image: "illari.png";
};

export type JunkerQueen = {
  name: "Junker Queen";
  image: "junkerqueen.png";
};

export type Junkrat = {
  name: "Junkrat";
  image: "junkrat.png";
};

export type Kiriko = {
  name: "Kiriko";
  image: "kiriko.png";
};

export type Lifeweaver = {
  name: "Lifeweaver";
  image: "lifeweaver.png";
};

export type Lucio = {
  name: "Lúcio";
  image: "lucio.png";
};

export type Mei = {
  name: "Mei";
  image: "mei.png";
};

export type Mercy = {
  name: "Mercy";
  image: "mercy.png";
};

export type Moira = {
  name: "Moira";
  image: "moira.png";
};

export type Orisa = {
  name: "Orisa";
  image: "orisa.png";
};

export type Pharah = {
  name: "Pharah";
  image: "pharah.png";
};

export type Ramattra = {
  name: "Ramattra";
  image: "ramattra.png";
};

export type Reaper = {
  name: "Reaper";
  image: "reaper.png";
};

export type Reinhardt = {
  name: "Reinhardt";
  image: "reinhardt.png";
};

export type Roadhog = {
  name: "Roadhog";
  image: "roadhog.png";
};

export type Sigma = {
  name: "Sigma";
  image: "sigma.png";
};

export type Sojourn = {
  name: "Sojourn";
  image: "sojourn.png";
};

export type Soldier76 = {
  name: "Soldier: 76";
  image: "soldier76.png";
};

export type Sombra = {
  name: "Sombra";
  image: "sombra.png";
};

export type Symmetra = {
  name: "Symmetra";
  image: "symmetra.png";
};

export type Torbjorn = {
  name: "Torbjörn";
  image: "torbjorn.png";
};

export type Tracer = {
  name: "Tracer";
  image: "tracer.png";
};

export type Widowmaker = {
  name: "Widowmaker";
  image: "widowmaker.png";
};

export type Winston = {
  name: "Winston";
  image: "winston.png";
};

export type WreckingBall = {
  name: "Wrecking Ball";
  image: "wreckingball.png";
};

export type Zarya = {
  name: "Zarya";
  image: "zarya.png";
};

export type Zenyatta = {
  name: "Zenyatta";
  image: "zenyatta.png";
};

export type Tank =
  | Dva
  | Doomfist
  | JunkerQueen
  | Orisa
  | Ramattra
  | Reinhardt
  | Roadhog
  | Sigma
  | Winston
  | WreckingBall
  | Zarya;
export type DPS =
  | Ashe
  | Bastion
  | Cassidy
  | Echo
  | Genji
  | Hanzo
  | Junkrat
  | Mei
  | Pharah
  | Reaper
  | Sojourn
  | Soldier76
  | Sombra
  | Symmetra
  | Torbjorn
  | Tracer
  | Widowmaker;
export type Support =
  | Ana
  | Baptiste
  | Brigitte
  | Illari
  | Kiriko
  | Lifeweaver
  | Lucio
  | Mercy
  | Moira
  | Zenyatta;
