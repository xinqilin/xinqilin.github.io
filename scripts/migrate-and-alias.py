#!/usr/bin/env python3
"""
Blog migration script:
1. Injects aliases (old URL) into each file's front-matter
2. Reports git mv commands to execute
"""
import re
import os
import subprocess
import sys

BASE = "/Users/bill/project-blog"

# Each tuple: (src_relative, dst_relative)
MIGRATIONS = [
    # DevOps → Container
    ("content/post/DevOps/Docker-compose.md",         "content/post/Container/docker-compose.md"),
    ("content/post/DevOps/Docker-MySQL.md",            "content/post/Container/docker-mysql.md"),
    ("content/post/DevOps/Docker-Network.md",          "content/post/Container/docker-network.md"),
    ("content/post/DevOps/Dockerfile-basic.md",        "content/post/Container/dockerfile-basic.md"),
    ("content/post/DevOps/Dockerfile-docker_in_docker.md", "content/post/Container/dockerfile-multi-arch-selenium.md"),
    # Tools → CLI
    ("content/post/Tools/Awk.md",         "content/post/CLI/awk.md"),
    ("content/post/Tools/Sed.md",         "content/post/CLI/sed.md"),
    ("content/post/Tools/Find.md",        "content/post/CLI/find.md"),
    ("content/post/Tools/Xargs.md",       "content/post/CLI/xargs.md"),
    ("content/post/Tools/Curl.md",        "content/post/CLI/curl.md"),
    ("content/post/Tools/Dig.md",         "content/post/CLI/dig.md"),
    ("content/post/Tools/Yaml.md",        "content/post/CLI/yaml.md"),
    ("content/post/Tools/FileExpress.md", "content/post/CLI/shell-test-operators.md"),
    # Tools/Ubuntu → Linux
    ("content/post/Tools/Ubuntu.md",      "content/post/Linux/ubuntu-server-setup.md"),
    # Others → Git / Linux
    ("content/post/Others/Git.md",        "content/post/Git/git-tag.md"),
    ("content/post/Others/Github-ssh.md", "content/post/Git/github-ssh.md"),
    ("content/post/Others/Env.md",        "content/post/Linux/shell-env-config.md"),
    # Backend renames
    ("content/post/Backend/@Autowired.md",      "content/post/Backend/spring-dependency-injection.md"),
    ("content/post/Backend/JWT.md",             "content/post/Backend/jwt-spring-security.md"),
    ("content/post/Backend/Swagger2.md",        "content/post/Backend/springdoc-openapi.md"),
    ("content/post/Backend/RestTemplate.md",    "content/post/Backend/spring-http-clients.md"),
    ("content/post/Backend/ReactiveJava.md",    "content/post/Backend/spring-webflux-reactor.md"),
    ("content/post/Backend/SftpUtil.md",        "content/post/Backend/sftp-jsch-mwiede.md"),
    ("content/post/Backend/FtpUtil.md",         "content/post/Backend/ftp-utility.md"),
    ("content/post/Backend/JpaPageable.md",     "content/post/Backend/jpa-pagination.md"),
    ("content/post/Backend/lateinit.md",        "content/post/Backend/kotlin-lateinit-vs-lazy.md"),
    ("content/post/Backend/Map-sort-by-value.md", "content/post/Backend/map-sort-by-value.md"),
    ("content/post/Backend/MapCompute.md",      "content/post/Backend/map-compute.md"),
    ("content/post/Backend/ORMEnumType.md",     "content/post/Backend/jpa-enum-mapping.md"),
    ("content/post/Backend/QueryDSL.md",        "content/post/Backend/querydsl-jpa.md"),
    ("content/post/Backend/SideProjectConfig.md", "content/post/Backend/spring-boot-3-starter.md"),
    ("content/post/Backend/SpringAnnotation.md",  "content/post/Backend/spring-annotations-overview.md"),
    ("content/post/Backend/TreeMap.md",         "content/post/Backend/tree-map.md"),
    ("content/post/Backend/TreeSet.md",         "content/post/Backend/tree-set.md"),
    # Architecture renames
    ("content/post/Architecture/SnowFlake-DistributionKey.md", "content/post/Architecture/snowflake-distributed-id.md"),
    ("content/post/Architecture/BadSmell.md",   "content/post/Architecture/bad-smell.md"),
    ("content/post/Architecture/CQRS.md",       "content/post/Architecture/cqrs.md"),
    ("content/post/Architecture/SOLID.md",      "content/post/Architecture/solid.md"),
    ("content/post/Architecture/UML.md",        "content/post/Architecture/uml.md"),
    # Algorithm renames
    ("content/post/Algorithm/Backtracking.md",      "content/post/Algorithm/backtracking.md"),
    ("content/post/Algorithm/GraphAccountMerge.md", "content/post/Algorithm/graph-account-merge.md"),
    ("content/post/Algorithm/MergeSort.md",         "content/post/Algorithm/merge-sort.md"),
    ("content/post/Algorithm/ReverseLinkedList.md", "content/post/Algorithm/reverse-linked-list.md"),
    ("content/post/Algorithm/TopologicalSort.md",   "content/post/Algorithm/topological-sort.md"),
    ("content/post/Algorithm/TreeTraversal.md",     "content/post/Algorithm/tree-traversal.md"),
    ("content/post/Algorithm/UnionFind.md",         "content/post/Algorithm/union-find.md"),
    # DesignPattern renames (22 files)
    ("content/post/DesignPattern/Adapter.md",               "content/post/DesignPattern/adapter.md"),
    ("content/post/DesignPattern/Bridge.md",                "content/post/DesignPattern/bridge.md"),
    ("content/post/DesignPattern/Builder.md",               "content/post/DesignPattern/builder.md"),
    ("content/post/DesignPattern/ChainOfResponsibility.md", "content/post/DesignPattern/chain-of-responsibility.md"),
    ("content/post/DesignPattern/Command.md",               "content/post/DesignPattern/command.md"),
    ("content/post/DesignPattern/Composite.md",             "content/post/DesignPattern/composite.md"),
    ("content/post/DesignPattern/Decorator.md",             "content/post/DesignPattern/decorator.md"),
    ("content/post/DesignPattern/Facade.md",                "content/post/DesignPattern/facade.md"),
    ("content/post/DesignPattern/Factory.md",               "content/post/DesignPattern/factory.md"),
    ("content/post/DesignPattern/Flyweight.md",             "content/post/DesignPattern/flyweight.md"),
    ("content/post/DesignPattern/Interpreter.md",           "content/post/DesignPattern/interpreter.md"),
    ("content/post/DesignPattern/Iterator.md",              "content/post/DesignPattern/iterator.md"),
    ("content/post/DesignPattern/Mediator.md",              "content/post/DesignPattern/mediator.md"),
    ("content/post/DesignPattern/Memento.md",               "content/post/DesignPattern/memento.md"),
    ("content/post/DesignPattern/Observer.md",              "content/post/DesignPattern/observer.md"),
    ("content/post/DesignPattern/Prototype.md",             "content/post/DesignPattern/prototype.md"),
    ("content/post/DesignPattern/Proxy.md",                 "content/post/DesignPattern/proxy.md"),
    ("content/post/DesignPattern/Singleton.md",             "content/post/DesignPattern/singleton.md"),
    ("content/post/DesignPattern/State.md",                 "content/post/DesignPattern/state.md"),
    ("content/post/DesignPattern/Strategy.md",              "content/post/DesignPattern/strategy.md"),
    ("content/post/DesignPattern/TemplateMethod.md",        "content/post/DesignPattern/template-method.md"),
    ("content/post/DesignPattern/Visitor.md",               "content/post/DesignPattern/visitor.md"),
]


def old_url_from_src(src_relative):
    """Derive the original Hugo URL from the source file path."""
    # src_relative: content/post/Backend/JWT.md
    parts = src_relative.split("/")  # ['content', 'post', 'Backend', 'JWT.md']
    category = parts[2]
    filename = os.path.splitext(parts[3])[0]  # 'JWT'
    return f"/post/{category}/{filename}/"


def add_alias(filepath, alias_url):
    """Inject aliases into a markdown file's YAML front-matter."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if not content.startswith("---"):
        print(f"  SKIP (no front-matter): {filepath}")
        return

    # Find second --- (end of front-matter)
    fm_end = content.find("\n---", 3)
    if fm_end == -1:
        print(f"  SKIP (malformed front-matter): {filepath}")
        return

    fm = content[3:fm_end]     # YAML block between the two ---
    rest = content[fm_end:]    # \n--- + body

    if "aliases:" in fm:
        # Already has aliases — prepend our entry
        fm = re.sub(r"(aliases:\s*\n)", r"\1  - " + alias_url + "\n", fm, count=1)
    else:
        # Append new aliases block before closing front-matter
        fm = fm.rstrip("\n") + f"\naliases:\n  - {alias_url}\n"

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("---" + fm + rest)


def run():
    dry_run = "--dry-run" in sys.argv
    errors = []

    for src, dst in MIGRATIONS:
        src_abs = os.path.join(BASE, src)
        dst_abs = os.path.join(BASE, dst)

        if not os.path.isfile(src_abs):
            errors.append(f"NOT FOUND: {src_abs}")
            continue

        alias_url = old_url_from_src(src)

        if dry_run:
            print(f"[DRY] {src}  →  {dst}  (alias: {alias_url})")
            continue

        # 1. Inject alias into source file
        add_alias(src_abs, alias_url)

        # 2. git mv src dst
        result = subprocess.run(
            ["git", "mv", src, dst],
            cwd=BASE,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            errors.append(f"git mv failed: {src} -> {dst}\n  {result.stderr}")
        else:
            print(f"  OK: {src} -> {dst}")

    if errors:
        print("\nERRORS:")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)
    else:
        print(f"\nDone. {len(MIGRATIONS)} migrations.")


if __name__ == "__main__":
    run()
