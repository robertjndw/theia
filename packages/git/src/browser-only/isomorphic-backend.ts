import { inject, injectable } from 'inversify';
import { Git } from '../common/git';
import { Repository, WorkingDirectoryStatus, Branch, StashEntry, Remote, GitResult, GitFileChange, CommitWithChanges, GitFileBlame } from '../common';
import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { FSPromises } from './opfs-wrapper';

/**
 * `insomnia` based Git implementation.
 */
@injectable()
export class IsomorphicGit implements Git {
    @inject(FSPromises)
    protected readonly fs: FSPromises;

    async clone(remoteUrl: string, options: Git.Options.Clone): Promise<Repository> {
        console.log('Insomnia clone', remoteUrl, options);
        await git.clone({
            fs: this.fs,
            http,
            dir: options.localUri.replace('file://', ''),
            corsProxy: 'http://localhost:3001', // TODO change this to a prober value
            url: remoteUrl,
            singleBranch: true,
            depth: 1
        })
        const localUri = options.localUri;
        return { localUri };
    }
    repositories(workspaceRootUri: string, options: Git.Options.Repositories): Promise<Repository[]> {
        return Promise.resolve([]);
    }
    status(repository: Repository): Promise<WorkingDirectoryStatus> {
        throw new Error('Method not implemented.');
    }
    add(repository: Repository, uri: string | string[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    unstage(repository: Repository, uri: string | string[], options?: Git.Options.Unstage): Promise<void> {
        throw new Error('Method not implemented.');
    }
    branch(repository: Repository, options: { type: 'current'; }): Promise<Branch | undefined>;
    branch(repository: Repository, options: { type: 'local' | 'remote' | 'all'; }): Promise<Branch[]>;
    branch(repository: Repository, options: Git.Options.BranchCommand.Create | Git.Options.BranchCommand.Rename | Git.Options.BranchCommand.Delete): Promise<void>;
    branch(repository: unknown, options: unknown): Promise<void> | Promise<import("../common").Branch[]> | Promise<import("../common").Branch | undefined> {
        throw new Error('Method not implemented.');
    }
    checkout(repository: Repository, options: Git.Options.Checkout.CheckoutBranch | Git.Options.Checkout.WorkingTreeFile): Promise<void> {
        throw new Error('Method not implemented.');
    }
    commit(repository: Repository, message?: string, options?: Git.Options.Commit): Promise<void> {
        throw new Error('Method not implemented.');
    }
    fetch(repository: Repository, options?: Git.Options.Fetch): Promise<void> {
        throw new Error('Method not implemented.');
    }
    push(repository: Repository, options?: Git.Options.Push): Promise<void> {
        throw new Error('Method not implemented.');
    }
    pull(repository: Repository, options?: Git.Options.Pull): Promise<void> {
        throw new Error('Method not implemented.');
    }
    reset(repository: Repository, options: Git.Options.Reset): Promise<void> {
        throw new Error('Method not implemented.');
    }
    merge(repository: Repository, options: Git.Options.Merge): Promise<void> {
        throw new Error('Method not implemented.');
    }
    show(repository: Repository, uri: string, options?: Git.Options.Show): Promise<string> {
        throw new Error('Method not implemented.');
    }
    stash(repository: Repository, options?: Readonly<{ action?: 'push'; message?: string; }>): Promise<void>;
    stash(repository: Repository, options: Readonly<{ action: 'list'; }>): Promise<StashEntry[]>;
    stash(repository: Repository, options: Readonly<{ action: 'clear'; }>): Promise<void>;
    stash(repository: Repository, options: Readonly<{ action: 'apply' | 'pop' | 'drop'; id?: string; }>): Promise<void>;
    stash(repository: unknown, options?: unknown): Promise<void> | Promise<import("../common").StashEntry[]> {
        throw new Error('Method not implemented.');
    }
    remote(repository: Repository): Promise<string[]>;
    remote(repository: Repository, options: { verbose: true; }): Promise<Remote[]>;
    remote(repository: unknown, options?: unknown): Promise<import("../common").Remote[]> | Promise<string[]> {
        throw new Error('Method not implemented.');
    }
    exec(repository: Repository, args: string[], options?: Git.Options.Execution): Promise<GitResult> {
        throw new Error('Method not implemented.');
    }
    diff(repository: Repository, options?: Git.Options.Diff): Promise<GitFileChange[]> {
        throw new Error('Method not implemented.');
    }
    log(repository: Repository, options?: Git.Options.Log): Promise<CommitWithChanges[]> {
        throw new Error('Method not implemented.');
    }
    revParse(repository: Repository, options: Git.Options.RevParse): Promise<string | undefined> {
        throw new Error('Method not implemented.');
    }
    blame(repository: Repository, uri: string, options?: Git.Options.Blame): Promise<GitFileBlame | undefined> {
        throw new Error('Method not implemented.');
    }
    lsFiles(repository: Repository, uri: string, options: { errorUnmatch: true; }): Promise<boolean>;
    lsFiles(repository: Repository, uri: string, options?: Git.Options.LsFiles): Promise<any>;
    lsFiles(repository: unknown, uri: unknown, options?: unknown): Promise<any> | Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    dispose(): void {
        throw new Error('Method not implemented.');
    }

}
