module bountychain::task_platform {
    use one::object::{Self, UID};
    use one::tx_context::{Self, TxContext};
    use one::transfer;
    use one::event;
    use std::string::{Self, String};
    use one::coin::{Self, Coin};
    use one::one::ONE;
    use one::balance::{Self, Balance};
    use one::table::{Self, Table};

    // Error codes
    const EUnauthorized: u64 = 1;
    const ETaskNotActive: u64 = 2;
    const EInsufficientReward: u64 = 3;
    const EAlreadySubmitted: u64 = 4;

    // Task struct
    public struct Task has key {
        id: UID,
        creator: address,
        title: String,
        description: String,
        category: String,
        reward: Balance<ONE>,
        reward_amount: u64,
        active: bool,
        submissions: Table<address, bool>,
        total_submissions: u64,
        winner: address,
        created_at: u64,
    }

    // Submission struct
    public struct Submission has key, store {
        id: UID,
        task_id: address,
        submitter: address,
        proof_url: String,
        description: String,
        ai_score: u64,
        submitted_at: u64,
    }

    // Events
    public struct TaskCreated has copy, drop {
        task_id: address,
        creator: address,
        title: String,
        reward_amount: u64,
    }

    public struct SubmissionMade has copy, drop {
        submission_id: address,
        task_id: address,
        submitter: address,
    }

    public struct RewardClaimed has copy, drop {
        task_id: address,
        winner: address,
        amount: u64,
    }

    // Create task
    public entry fun create_task(
        title: String,
        description: String,
        category: String,
        reward: Coin<ONE>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let reward_amount = coin::value(&reward);
        
        let task = Task {
            id: object::new(ctx),
            creator: sender,
            title,
            description,
            category,
            reward: coin::into_balance(reward),
            reward_amount,
            active: true,
            submissions: table::new(ctx),
            total_submissions: 0,
            winner: @0x0,
            created_at: tx_context::epoch(ctx),
        };

        let task_addr = object::uid_to_address(&task.id);

        event::emit(TaskCreated {
            task_id: task_addr,
            creator: sender,
            title: task.title,
            reward_amount,
        });

        transfer::share_object(task);
    }

    // Submit work
    public entry fun submit_work(
        task: &mut Task,
        proof_url: String,
        description: String,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(task.active, ETaskNotActive);
        assert!(!table::contains(&task.submissions, sender), EAlreadySubmitted);

        let submission = Submission {
            id: object::new(ctx),
            task_id: object::uid_to_address(&task.id),
            submitter: sender,
            proof_url,
            description,
            ai_score: 0,
            submitted_at: tx_context::epoch(ctx),
        };

        let submission_addr = object::uid_to_address(&submission.id);
        
        table::add(&mut task.submissions, sender, true);
        task.total_submissions = task.total_submissions + 1;

        event::emit(SubmissionMade {
            submission_id: submission_addr,
            task_id: object::uid_to_address(&task.id),
            submitter: sender,
        });

        transfer::transfer(submission, sender);
    }

    // AI score submission
    public entry fun score_submission(
        submission: &mut Submission,
        score: u64,
        ctx: &mut TxContext
    ) {
        assert!(score <= 100, 999);
        submission.ai_score = score;
    }

    // Award bounty
    public entry fun award_bounty(
        task: &mut Task,
        winner: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == task.creator, EUnauthorized);
        assert!(task.active, ETaskNotActive);

        let reward_amount = task.reward_amount;
        let reward_coin = coin::take(&mut task.reward, reward_amount, ctx);
        
        task.active = false;
        task.winner = winner;

        event::emit(RewardClaimed {
            task_id: object::uid_to_address(&task.id),
            winner,
            amount: reward_amount,
        });

        transfer::public_transfer(reward_coin, winner);
    }

    // View functions
    public fun get_task_info(task: &Task): (String, u64, bool, u64) {
        (task.title, task.reward_amount, task.active, task.total_submissions)
    }

    public fun get_submission_score(submission: &Submission): u64 {
        submission.ai_score
    }
}
