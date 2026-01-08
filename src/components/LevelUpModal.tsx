import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LevelConfig } from '@/lib/levels';
import { Confetti } from '@/components/Confetti';
import { cn } from '@/lib/utils';
import { ArrowRight, PartyPopper } from 'lucide-react';

interface LevelUpModalProps {
  open: boolean;
  onClose: () => void;
  previousLevel: LevelConfig | null;
  newLevel: LevelConfig;
}

export function LevelUpModal({ open, onClose, previousLevel, newLevel }: LevelUpModalProps) {
  const NewIcon = newLevel.icon;
  const PreviousIcon = previousLevel?.icon;

  return (
    <>
      <Confetti isActive={open} />
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md overflow-hidden p-0">
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="relative"
              >
                <div className={cn('bg-gradient-to-br p-8 text-center text-white', newLevel.gradient)}>
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.2 }}
                    className="mx-auto mb-4 w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
                  >
                    <NewIcon className="w-10 h-10" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <PartyPopper className="w-6 h-6" />
                      <h2 className="text-2xl font-bold">Parabéns!</h2>
                      <PartyPopper className="w-6 h-6" />
                    </div>
                    <p className="text-lg opacity-90">Você subiu de nível!</p>
                  </motion.div>
                </div>

                <div className="p-6 space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center justify-center gap-4"
                  >
                    {previousLevel && PreviousIcon && (
                      <div className="text-center">
                        <div className={cn('p-3 rounded-full mx-auto mb-1', previousLevel.bgClass)}>
                          <PreviousIcon className={cn('w-6 h-6', previousLevel.textClass)} />
                        </div>
                        <p className={cn('text-sm font-medium', previousLevel.textClass)}>
                          {previousLevel.name}
                        </p>
                      </div>
                    )}

                    <ArrowRight className="w-6 h-6 text-muted-foreground" />

                    <div className="text-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={cn('p-3 rounded-full mx-auto mb-1', newLevel.bgClass)}
                      >
                        <NewIcon className={cn('w-6 h-6', newLevel.textClass)} />
                      </motion.div>
                      <p className={cn('text-sm font-bold', newLevel.textClass)}>
                        {newLevel.name}
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <Button 
                      onClick={onClose} 
                      className={cn('w-full bg-gradient-to-r text-white', newLevel.gradient)}
                    >
                      Incrível!
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}
