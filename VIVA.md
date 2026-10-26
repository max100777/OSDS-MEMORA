# MEMORA Viva Guide

1. **What is virtual memory?** An abstraction mapping process virtual pages to physical frames, with non-resident pages stored on secondary storage.
2. **What is demand paging?** Loading a page only when a process first references it.
3. **What causes a page fault?** A reference to a valid virtual page whose present bit is false.
4. **How does MEMORA model a page table?** Every event records each known page's validity, presence, frame number, and dirty state.
5. **What does FIFO evict?** The page resident for the longest time, regardless of recent use.
6. **What does LRU evict?** The resident page with the oldest logical last-access timestamp.
7. **Why is Optimal offline?** It requires future references that an online OS cannot know.
8. **What is Belady's anomaly?** FIFO can incur more faults after receiving more frames.
9. **Why are LRU and Optimal stack algorithms?** The pages held with `n` frames are a subset of those held with `n+1` frames.
10. **What is temporal locality?** Recently used data is likely to be reused soon.
11. **What is spatial locality?** Addresses near a recent address are likely to be accessed soon.
12. **How does the Markov predictor work?** It estimates `P(next=v | current=u)` from observed transition counts.
13. **How is future leakage prevented?** The online model updates only after processing the current reference.
14. **What is the LSTM input?** A sliding window of prior page identifiers.
15. **What is the LSTM output?** A softmax distribution over the configured page vocabulary.
16. **Why does prediction accuracy differ from paging performance?** Next-page accuracy does not reveal longer-term reuse distance.
17. **What is the adaptive controller?** A causal policy selecting LRU, Markov, or LSTM using recent faults, confidence, accuracy, and cooldown.
18. **Why use a cooldown?** It prevents unstable policy switching on noisy short-term observations.
19. **What is thrashing?** Sustained excessive paging when active working-set demand exceeds available frames.
20. **What is PFF?** Page-fault frequency measured over a recent reference window.
21. **What is a working set?** The distinct pages referenced during a chosen recent window.
22. **What does the health score represent?** A transparent weighted penalty for fault rate, capacity pressure, and rising fault trend.
23. **Local or global replacement?** MEMORA's multi-process simulator uses local LRU inside dynamically sized per-process partitions.
24. **How is frame conservation enforced?** Reallocation transfers an existing frame from a donor to a recipient.
25. **What is Jain's fairness index?** `(sum x)^2/(n*sum(x^2))`; one is perfectly equal service.
26. **What does a dirty bit mean?** A resident page was written and must be written back if evicted.
27. **How are costs modeled?** Memory access, disk read on a fault, and disk write on dirty eviction are accumulated separately from wall-clock runtime.
28. **What is an LSTM fallback?** When unavailable or untrained, the predictor uses recent empirical frequency and deterministic LRU tie-breaking.
29. **Is this a kernel memory manager?** No. It is a deterministic educational simulator and never changes host page tables.
30. **Does adaptive always beat LRU?** No; comparisons report measured results and expose workloads where prediction overhead or error makes it worse.
