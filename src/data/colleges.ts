/* Faculdades fictícias para a criação da carreira (cores do uniforme universitário). */
export interface College {
  id: string;
  name: string;
  colors: [string, string];
}

export const COLLEGES: College[] = [
  { id: 'pinecrest', name: 'PINECREST LENHADORES', colors: ['#2E7D4F', '#E8C547'] },
  { id: 'northgate', name: 'NORTHGATE CORVOS', colors: ['#2B2D42', '#C9CEE0'] },
  { id: 'redmesa', name: 'RED MESA ESCORPIÕES', colors: ['#B3342B', '#F2C14E'] },
  { id: 'bayport', name: 'BAYPORT MARUJOS', colors: ['#1F4E8C', '#F4F1E8'] },
  { id: 'stonebridge', name: 'STONEBRIDGE LEÕES', colors: ['#6A2C91', '#F2C14E'] },
  { id: 'sunvalley', name: 'SUN VALLEY SOLARES', colors: ['#E8761F', '#1F1F28'] },
  { id: 'ironcliff', name: 'IRONCLIFF FALCÕES', colors: ['#5A6270', '#E85D3A'] },
  { id: 'lakeshore', name: 'LAKESHORE ORCAS', colors: ['#0F7B8A', '#F4F1E8'] },
];

export const hexNum = (h: string) => parseInt(h.slice(1), 16);
