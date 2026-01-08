import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface QuizQuestionData {
  question: string;
  options: string[];
  correct_option: number;
  order_index: number;
}

interface QuizQuestionEditorProps {
  index: number;
  data: QuizQuestionData;
  onChange: (data: QuizQuestionData) => void;
}

export function QuizQuestionEditor({ index, data, onChange }: QuizQuestionEditorProps) {
  const updateQuestion = (question: string) => {
    onChange({ ...data, question });
  };

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...data.options];
    newOptions[optionIndex] = value;
    onChange({ ...data, options: newOptions });
  };

  const updateCorrectOption = (value: string) => {
    onChange({ ...data, correct_option: Number(value) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="font-medium">Pergunta {index + 1}</Label>
        <Input
          placeholder="Digite a pergunta..."
          value={data.question}
          onChange={(e) => updateQuestion(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <Label className="text-sm text-muted-foreground">
          Opções (selecione a correta)
        </Label>
        <RadioGroup
          value={String(data.correct_option)}
          onValueChange={updateCorrectOption}
          className="space-y-2"
        >
          {data.options.map((option, optIndex) => (
            <div key={optIndex} className="flex items-center gap-2">
              <RadioGroupItem value={String(optIndex)} id={`q${index}-opt${optIndex}`} />
              <Input
                placeholder={`Opção ${optIndex + 1}`}
                value={option}
                onChange={(e) => updateOption(optIndex, e.target.value)}
                className="flex-1"
              />
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
