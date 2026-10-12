// Tappable lecture diagrams: shown in a lesson's reading section
// (LessonChunk.figure) and with quiz questions (Question.figure,
// "What is the highlighted part?").
//
// Each topic's figures are in data/figures/<topic>.ts and their pictures in
// public/figures/<topic>/ — crops of the lecture slides, so what learners see
// is the lecture's own diagram. To add one: crop the slide into
// public/figures/<topic>/, describe its spots in the topic file, list it
// below, then set `figure` on a reading section and/or questions.
import { figures as cardiovascular } from '@/data/figures/cardiovascular-physiology';
import type { FigureSpot, LessonFigure } from '@/data/lesson-types';

export const allFigures: LessonFigure[] = [...cardiovascular];

const byId = new Map(allFigures.map((figure) => [figure.id, figure]));

export function getFigure(id: string | undefined | null): LessonFigure | undefined {
  return id ? byId.get(id) : undefined;
}

export function getSpot(figure: LessonFigure, spotId: string | undefined | null): FigureSpot | undefined {
  return spotId ? figure.spots.find((spot) => spot.id === spotId) : undefined;
}
